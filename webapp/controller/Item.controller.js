sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button"
], function (Controller, MessageToast, JSONModel, Dialog, Button) {
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

            // Definir las opciones para el motivo (motivoModel)
            var oMotivoData = {
                motivos: [
                    { key: "0001", text: "Obsolescencia" },
                    { key: "0002", text: "Defectuoso" },
                    { key: "0003", text: "Fin de vida útil" },
                    { key: "0004", text: "Otros" }
                ]
            };
            var oMotivoModel = new JSONModel(oMotivoData);
            this.getView().setModel(oMotivoModel, "motivoModel");

            // Verificar si el modelo mainModel existe
            var oMainModel = oComponent.getModel("mainModel");
            if (!oMainModel) {
                console.error("Modelo mainModel no encontrado en Item.onInit");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            // Si quieres precargar un valor por defecto
            if (oMainModel.getProperty("/header/move_type") === "551" && !oMainModel.getProperty("/currentItem/move_reas")) {
                oMainModel.setProperty("/currentItem/move_reas", "0001"); // Valor por defecto
            }
        },

        _onObjectMatched: function () {
            console.log("Navegación a vista Item exitosa");
        },

        onSaveItem: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (!oModel) {
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            var oCurrentItem = oModel.getProperty("/currentItem");
            var oItems = oModel.getProperty("/items") || [];

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

            if (bHasErrors) return;

            // Guardar el ítem
            oItems.push(Object.assign({}, oCurrentItem));
            oModel.setProperty("/items", oItems);
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
            // Limpiar los campos y regresar a la pantalla principal
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

            if (!oItems || oItems.length === 0) {
                MessageToast.show("Por favor, agrega al menos un ítem antes de enviar");
                return;
            }

            // Estructura de datos para enviar al backend (simulada)
            var oData = {
                GOODSMVT_HEADER: {
                    PSTNG_DATE: oHeader.pstng_date || new Date().toISOString().split('T')[0],
                    DOC_DATE: oHeader.doc_date || new Date().toISOString().split('T')[0],
                    REF_DOC_NO: oHeader.ref_doc_no || "",
                    HEADER_TXT: oHeader.header_txt || "",
                    VER_GR_GI_SLIP: oHeader.ver_gr_gi_slip || "",
                    VER_GR_GI_SLIPX: oHeader.ver_gr_gi_slipx || ""
                },
                GOODSMVT_CODE: {
                    GM_CODE: oModel.getProperty("/code/gm_code") || "03"
                },
                GOODSMVT_ITEM: oItems.map(function (item) {
                    return {
                        MATERIAL: item.material,
                        PLANT: item.plant,
                        STGE_LOC: item.stge_loc,
                        BATCH: item.batch,
                        MOVE_TYPE: oHeader.move_type,
                        ENTRY_QNT: item.entry_qnt,
                        ENTRY_UOM: item.entry_uom,
                        COSTCENTER: item.costcenter,
                        ORDERID: item.orderid,
                        MOVE_REAS: item.move_reas
                    };
                })
            };

            console.log("Datos enviados al backend:", oData);

            // Simulación por ahora
            MessageToast.show("Datos enviados al backend (simulado)");
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        onEntryUomChange: function (oEvent) {
            var sValue = oEvent.getSource().getValue();
            console.log("Unidad de medida cambiada:", sValue);
        },

        onScanMaterial: function () {
            var that = this;
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
                        oDialog.close();
                    }
                }),
                afterOpen: function () {
                    Quagga.init({
                        inputStream: {
                            name: "Live",
                            type: "LiveStream",
                            target: document.querySelector('#barcode-scanner'),
                            constraints: {
                                width: 640,
                                height: 480,
                                facingMode: "environment"
                            }
                        },
                        decoder: {
                            readers: ["code_128_reader", "ean_reader", "ean_8_reader", "upc_reader"]
                        }
                    }, function (err) {
                        if (err) {
                            console.error("Error al inicializar Quagga:", err);
                            MessageToast.show("Error al iniciar el escáner: " + err);
                            oDialog.close();
                            return;
                        }
                        Quagga.start();
                    });

                    Quagga.onDetected(function (result) {
                        var code = result.codeResult.code;
                        MessageToast.show("Código escaneado: " + code);
                        that.getOwnerComponent().getModel("mainModel").setProperty("/currentItem/material", code);
                        Quagga.stop();
                        oDialog.close();
                    });
                },
                afterClose: function () {
                    Quagga.stop();
                    oDialog.destroy();
                }
            });

            oDialog.open();
        }
    });
});