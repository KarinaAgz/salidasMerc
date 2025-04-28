sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/Dialog",
    "sap/m/Button"
], function (Controller, MessageToast, ODataModel, Dialog, Button) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.Item", {
        onInit: function () {
            var oComponent = this.getOwnerComponent();
            if (!oComponent) {
                console.error("Componente no encontrado en Item.onInit");
                MessageToast.show("Error: Componente no encontrado");
                return;
            }

            var oRouter = oComponent.getRouter();
            if (oRouter) {
                console.log("Router inicializado en Item.onInit");
                oRouter.getRoute("RouteItem").attachPatternMatched(this._onObjectMatched, this);
            } else {
                console.error("Router no encontrado en Item.onInit");
                MessageToast.show("Error: Router no encontrado");
            }

            // Verificar si el modelo mainModel existe
            var oMainModel = oComponent.getModel("mainModel");
            if (!oMainModel) {
                console.error("Modelo mainModel no encontrado en Item.onInit");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            // Asegurarse de que /items esté inicializado como un array vacío
            if (!oMainModel.getProperty("/items")) {
                oMainModel.setProperty("/items", []);
                console.log("Inicializando /items como array vacío");
            }

            // Inicializar el modelo OData
            this._initializeODataModel();
        },

        _initializeODataModel: function () {
            // Asegúrate de configurar el servicio OData en tu manifest.json
            var oODataModel = this.getView().getModel("odataModel");
            if (!oODataModel) {
                console.error("Modelo OData no encontrado. Asegúrate de configurarlo en manifest.json");
                MessageToast.show("Error: Modelo OData no configurado");
            }
        },

        _onObjectMatched: function () {
            console.log("Navegación a vista Item exitosa");

            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en _onObjectMatched");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            oModel.setProperty("/currentItem", {
                material: "",
                plant: "",
                stge_loc: "",
                batch: "",
                entry_qnt: "",
                entry_uom: "",
                costcenter: "",
                orderid: "",
                move_reas: ""
            });

            var sMoveType = oModel.getProperty("/header/move_type");
            console.log("Move Type al llegar a Item:", sMoveType);

            var oView = this.getView();
            oView.byId("costcenter").setVisible(sMoveType === "201" || sMoveType === "551");
            oView.byId("orderid").setVisible(sMoveType === "261");
            oView.byId("moveReas").setVisible(sMoveType === "551");

            // Cargar motivos desde T157D si MOVE_TYPE = 551
            if (sMoveType === "551") {
                this._loadMoveReasons();
                if (!oModel.getProperty("/currentItem/move_reas")) {
                    oModel.setProperty("/currentItem/move_reas", ""); // Valor por defecto vacío para forzar selección
                }
            }

            oModel.refresh(true);
        },

        _loadMoveReasons: function () {
            var oODataModel = this.getView().getModel("odataModel");
            var oModel = this.getOwnerComponent().getModel("mainModel");

            if (!oODataModel) {
                console.error("Modelo OData no disponible para consultar T157D");
                MessageToast.show("Error: No se puede consultar los motivos");
                return;
            }

            // Consultar la tabla T157D con BWART = 551
            oODataModel.read("/T157DSet", {
                filters: [
                    new sap.ui.model.Filter("BWART", sap.ui.model.FilterOperator.EQ, "551")
                ],
                success: function (oData) {
                    var aMotivos = [{
                        key: "",
                        text: "Seleccionar..."
                    }]; // Añadir opción por defecto

                    if (oData.results && oData.results.length > 0) {
                        aMotivos = aMotivos.concat(oData.results.map(function (oItem) {
                            return {
                                key: oItem.MOVEREAS, // Ajusta según el nombre del campo en T157D
                                text: oItem.MOVEREAS + " - " + (oItem.REASONTEXT || "Sin descripción")
                            };
                        }));
                    }

                    oModel.setProperty("/motivos", aMotivos);
                    console.log("Motivos cargados desde T157D:", aMotivos);
                }.bind(this),
                error: function (oError) {
                    console.error("Error al cargar motivos desde T157D:", oError);
                    MessageToast.show("Error al cargar los motivos del movimiento");
                }
            });
        },

        onMoveReasChange: function (oEvent) {
            var sSelectedKey = oEvent.getSource().getSelectedKey();
            var oModel = this.getOwnerComponent().getModel("mainModel");
            oModel.setProperty("/currentItem/move_reas", sSelectedKey);
            console.log("Motivo seleccionado:", sSelectedKey);
        },

        onSaveItem: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (!oModel) {
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            var oCurrentItem = oModel.getProperty("/currentItem");
            var oItems = oModel.getProperty("/items") || [];
            var sMoveType = oModel.getProperty("/header/move_type");

            console.log("Current Item antes de guardar:", oCurrentItem);
            console.log("Items actuales antes de guardar:", oItems);

            // Validar campos obligatorios
            var bHasErrors = false;
            if (!oCurrentItem.material) {
                MessageToast.show("Por favor, ingresa el material");
                this.byId("material").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }
            if (!oCurrentItem.entry_qnt) {
                MessageToast.show("Por favor, ingresa la cantidad");
                this.byId("entryQnt").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }
            if (!oCurrentItem.entry_uom) {
                MessageToast.show("Por favor, ingresa la unidad de medida");
                this.byId("entryUom").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }
            if (!oCurrentItem.plant) {
                MessageToast.show("Por favor, ingresa el centro");
                this.byId("plant").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }
            if (!oCurrentItem.stge_loc) {
                MessageToast.show("Por favor, ingresa el almacén");
                this.byId("stgeLoc").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }
            if ((sMoveType === "201" || sMoveType === "551") && !oCurrentItem.costcenter) {
                MessageToast.show("Por favor, ingresa el centro de costo");
                this.byId("costcenter").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }
            if (sMoveType === "261" && !oCurrentItem.orderid) {
                MessageToast.show("Por favor, ingresa el número de orden");
                this.byId("orderid").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }
            if (sMoveType === "551" && !oCurrentItem.move_reas) {
                MessageToast.show("Por favor, selecciona el motivo del movimiento");
                this.byId("moveReas").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }

            if (bHasErrors) {
                console.log("Errores de validación, no se guarda el ítem");
                return;
            }

            // Guardar el ítem
            oItems.push(Object.assign({}, oCurrentItem));
            oModel.setProperty("/items", oItems);
            console.log("Items después de guardar:", oModel.getProperty("/items"));

            // Limpiar currentItem
            oModel.setProperty("/currentItem", {
                material: "",
                plant: "",
                stge_loc: "",
                batch: "",
                entry_qnt: "",
                entry_uom: "",
                costcenter: "",
                orderid: "",
                move_reas: ""
            });
            MessageToast.show("Ítem guardado correctamente");
        },

        onNewEntry: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (!oModel) {
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            // Limpiar los campos sin guardar
            oModel.setProperty("/currentItem", {
                material: "",
                plant: "",
                stge_loc: "",
                batch: "",
                entry_qnt: "",
                entry_uom: "",
                costcenter: "",
                orderid: "",
                move_reas: ""
            });
            MessageToast.show("Formulario limpiado para una nueva entrada");
        },

        onCancel: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (!oModel) {
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            oModel.setProperty("/currentItem", {
                material: "",
                plant: "",
                stge_loc: "",
                batch: "",
                entry_qnt: "",
                entry_uom: "",
                costcenter: "",
                orderid: "",
                move_reas: ""
            });
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        onSubmit: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (!oModel) {
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            var oHeader = oModel.getProperty("/header");
            var oItems = oModel.getProperty("/items");

            console.log("Items al intentar enviar:", oItems);

            if (!oItems || oItems.length === 0) {
                MessageToast.show("Por favor, agrega al menos un ítem antes de enviar");
                return;
            }

            // Mostrar mensaje de que el proceso ha comenzado
            MessageToast.show("Enviando datos al backend...");

            // Mapear los ítems a GOODSMVT_ITEM
            var aGoodsMvtItems = [];
            var oODataModel = this.getView().getModel("odataModel");
            if (!oODataModel) {
                MessageToast.show("Error: Modelo OData no configurado");
                console.error("Modelo OData no disponible en onSubmit");
                return;
            }

            // Procesar cada ítem
            Promise.all(oItems.map(function (item) {
                console.log("Procesando ítem:", item);
                return this.getOrderPrUnIso(item.entry_uom).then(function (sIsoCode) {
                    console.log("Código ISO obtenido para unidad de medida", item.entry_uom, ":", sIsoCode);
                    return {
                        MATERIAL: item.material,
                        PLANT: item.plant,
                        STGE_LOC: item.stge_loc,
                        BATCH: item.batch,
                        MOVE_TYPE: oHeader.move_type,
                        ENTRY_QNT: item.entry_qnt,
                        ENTRY_UOM: item.entry_uom,
                        ORDERPR_UN_ISO: sIsoCode,
                        RESERV_NO: oHeader.reserv_no || "",
                        RES_ITEM: oHeader.res_item || "",
                        COSTCENTER: (oHeader.move_type === "201" || oHeader.move_type === "551") ? item.costcenter : "",
                        ORDERID: (oHeader.move_type === "261") ? item.orderid : oHeader.orderid || "",
                        MOVE_REAS: (oHeader.move_type === "551") ? item.move_reas : ""
                    };
                }).catch(function (sError) {
                    console.error("Error al procesar ítem:", sError);
                    throw new Error(sError);
                });
            }.bind(this))).then(function (aItems) {
                var oData = {
                    GOODSMVT_HEADER: {
                        PSTNG_DATE: oHeader.pstng_date || new Date().toISOString().split('T')[0],
                        DOC_DATE: oHeader.doc_date || new Date().toISOString().split('T')[0],
                        REF_DOC_NO: oHeader.ref_doc_no || "",
                        HEADER_TXT: oHeader.header_txt || "",
                        VER_GR_GI_SLIP: oHeader.ver_gr_gi_slip || "3",
                        VER_GR_GI_SLIPX: oHeader.ver_gr_gi_slipx || "X"
                    },
                    GOODSMVT_CODE: {
                        GM_CODE: oModel.getProperty("/code/gm_code") || "03"
                    },
                    GOODSMVT_ITEM: aItems
                };

                console.log("Datos enviados al backend:", oData);
                MessageToast.show("Datos enviados al backend con éxito");

                // Limpiar el modelo mainModel
                oModel.setData({
                    header: {
                        reference_type: "",
                        reserv_no: "",
                        res_item: "",
                        orderid: "",
                        move_type: "",
                        pstng_date: new Date().toISOString().split("T")[0],
                        doc_date: new Date().toISOString().split("T")[0],
                        ref_doc_no: "",
                        header_txt: "",
                        ver_gr_gi_slip: "3",
                        ver_gr_gi_slipx: "X"
                    },
                    code: {
                        gm_code: "03"
                    },
                    items: [],
                    currentItem: {
                        material: "",
                        plant: "",
                        stge_loc: "",
                        batch: "",
                        entry_qnt: "",
                        entry_uom: "",
                        costcenter: "",
                        orderid: "",
                        move_reas: ""
                    },
                    motivos: []
                });

                // Navegar a la vista Main
                var oRouter = this.getOwnerComponent().getRouter();
                if (oRouter) {
                    console.log("Navegando a RouteMain desde onSubmit");
                    oRouter.navTo("RouteMain");
                    MessageToast.show("Regresando a la vista principal...");
                } else {
                    console.error("Router no encontrado en onSubmit");
                    MessageToast.show("Error: No se pudo navegar a la vista principal");
                }
            }.bind(this)).catch(function (oError) {
                console.error("Error al procesar ítems:", oError.message || oError);
                MessageToast.show("Error al enviar los datos: " + (oError.message || "Error desconocido"));
            });
        },

        getOrderPrUnIso: function (sEntryUom) {
            var oODataModel = this.getView().getModel("odataModel");
            if (!oODataModel) {
                return Promise.reject("Modelo OData no disponible");
            }

            return new Promise(function (resolve, reject) {
                console.log("Consultando T006Set para unidad de medida:", sEntryUom);
                oODataModel.read("/T006Set", {
                    filters: [
                        new sap.ui.model.Filter("MSEHI", sap.ui.model.FilterOperator.EQ, sEntryUom)
                    ],
                    success: function (oData) {
                        if (oData.results && oData.results.length > 0) {
                            console.log("Unidad de medida encontrada:", oData.results[0]);
                            resolve(oData.results[0].ISOCODE);
                        } else {
                            reject("Unidad de medida '" + sEntryUom + "' no encontrada en T006");
                        }
                    },
                    error: function (oError) {
                        console.error("Error al consultar T006:", oError);
                        reject("Error al consultar T006 para la unidad de medida '" + sEntryUom + "': " + (oError.message || "Error desconocido"));
                    }
                });
            });
        },

        onEntryUomChange: function (oEvent) {
            var sValue = oEvent.getSource().getValue();
            console.log("Unidad de medida cambiada:", sValue);
        },

        onScanMaterial: function () {
            var that = this;
            var oComponent = this.getOwnerComponent();
            if (!oComponent) {
                console.error("Componente no encontrado en onScanMaterial");
                MessageToast.show("Error: Componente no encontrado");
                return;
            }

            var oMainModel = oComponent.getModel("mainModel");
            if (!oMainModel) {
                console.error("Modelo mainModel no encontrado en onScanMaterial");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            var oDialog = new Dialog({
                title: "Escanear Código de Barras",
                content: [
                    new sap.ui.core.HTML({
                        content: '<div id="barcode-scanner" style="width: 100%; height: 400px;"></div>'
                    })
                ],
                beginButton: new Button({
                    text: "Cancelar",
                    press: function () {
                        Quagga.stop();
                        if (oDialog && oDialog.isOpen()) {
                            oDialog.close();
                        }
                    }
                }),
                afterOpen: function () {
                    // Bandera para evitar múltiples detecciones
                    var bDetected = false;
                    // Variable para manejar el timeout
                    var oTimeout;

                    Quagga.init({
                        inputStream: {
                            name: "Live",
                            type: "LiveStream",
                            target: document.querySelector('#barcode-scanner'),
                            constraints: {
                                width: 640,
                                height: 480,
                                facingMode: "environment"
                            },
                            area: {
                                top: "5%",
                                right: "5%",
                                left: "5%",
                                bottom: "5%"
                            }
                        },
                        decoder: {
                            readers: [
                                "ean_reader",
                                "ean_8_reader",
                                "code_128_reader",
                                "upc_reader",
                                "code_39_reader",
                                "codabar_reader",
                                "i2of5_reader"
                            ]
                        },
                        locator: {
                            patchSize: "large",
                            halfSample: false
                        },
                        numOfWorkers: 4,
                        locate: true,
                        frequency: 5,
                        debug: true
                    }, function (err) {
                        if (err) {
                            console.error("Error al inicializar Quagga:", err);
                            MessageToast.show("Error al iniciar el escáner: " + err);
                            if (oDialog && oDialog.isOpen()) {
                                oDialog.close();
                            }
                            return;
                        }
                        console.log("Quagga inicializado correctamente");
                        Quagga.start();

                        // Timeout para cerrar el diálogo después de 60 segundos
                        oTimeout = setTimeout(function () {
                            if (oDialog && oDialog.isOpen()) {
                                Quagga.stop();
                                oDialog.close();
                                MessageToast.show("Tiempo de escaneo agotado. Asegúrate de que el código sea claro y esté bien iluminado.");
                            }
                        }, 60000);
                    });

                    Quagga.onDetected(function handler(result) {
                        // Evitar múltiples detecciones
                        if (bDetected) {
                            return;
                        }
                        bDetected = true;

                        // Desregistrar el manejador para evitar más detecciones
                        Quagga.offDetected(handler);

                        var code = result.codeResult.code;
                        console.log("Código detectado:", code);

                        if (!that.getOwnerComponent()) {
                            console.error("Componente no encontrado en onDetected");
                            MessageToast.show("Error: Componente no encontrado al detectar el código");
                            Quagga.stop();
                            if (oDialog && oDialog.isOpen()) {
                                oDialog.close();
                            }
                            return;
                        }

                        var oMainModel = that.getOwnerComponent().getModel("mainModel");
                        if (!oMainModel) {
                            console.error("Modelo mainModel no encontrado en onDetected");
                            MessageToast.show("Error: Modelo mainModel no encontrado al detectar el código");
                            Quagga.stop();
                            if (oDialog && oDialog.isOpen()) {
                                oDialog.close();
                            }
                            return;
                        }

                        try {
                            oMainModel.setProperty("/currentItem/material", code);
                            MessageToast.show("Código escaneado: " + code);
                            Quagga.stop();
                            if (oDialog && oDialog.isOpen()) {
                                oDialog.close();
                            }
                        } catch (error) {
                            console.error("Error al setear el código en el modelo:", error);
                            MessageToast.show("Error al guardar el código escaneado");
                            Quagga.stop();
                            if (oDialog && oDialog.isOpen()) {
                                oDialog.close();
                            }
                        } finally {
                            // Limpiar el timeout para evitar que se ejecute después de cerrar el diálogo
                            if (oTimeout) {
                                clearTimeout(oTimeout);
                            }
                        }
                    });

                    Quagga.onProcessed(function (result) {
                        if (result) {
                            console.log("Procesando imagen:", result);
                            if (result.boxes && result.boxes.length > 0) {
                                console.log("Cajas detectadas:", result.boxes);
                            } else {
                                console.log("No se detectaron cajas en este frame");
                            }
                        }
                    });
                },
                afterClose: function () {
                    Quagga.stop();
                    if (oDialog) {
                        oDialog.destroy();
                        oDialog = null; // Asegurarnos de que no se use más
                    }
                }
            });

            oDialog.open();
        }
    });
});