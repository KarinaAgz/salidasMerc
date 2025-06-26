sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Dialog",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Button"
], function (Controller, MessageToast, Fragment, JSONModel, Filter, FilterOperator, Dialog, Table, Column, ColumnListItem, Text, Button) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.Main", {
        _oClaseMovimientoFragmentControls: null,

        /**
         * Inicializa el controlador y carga los datos iniciales desde un archivo JSON.
         */
        onInit: function () {
            // Definir datos predeterminados en caso de que el archivo no se cargue
            var oDefaultData = {
                header: {
                    reference_type: "",
                    reserv_no: "",
                    res_item: "",
                    orderid: "",
                    move_type: "",
                    pstng_date: "",
                    doc_date: "",
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
                motivos: [
                    { key: "", text: "Seleccionar..." }
                ]
            };

            // Crear el modelo mainModel
            var oMainModel = new JSONModel();
            oMainModel.setDefaultBindingMode("TwoWay");

            // Intentar cargar el archivo JSON initialData
            try {
                oMainModel.loadData("localService/initialData.json", {}, false);
                if (!oMainModel.getData().header) {
                    oMainModel.setData(oDefaultData);
                    console.warn("Archivo initialData.json inválido, usando datos predeterminados");
                }
            } catch (oError) {
                console.error("Error al cargar initialData.json:", oError);
                oMainModel.setData(oDefaultData);
                MessageToast.show("Error al cargar datos iniciales, usando configuración predeterminada");
            }

            // Inicializar fechas con la fecha del sistema
            var sCurrentDate = new Date().toISOString().split("T")[0];
            oMainModel.setProperty("/header/pstng_date", sCurrentDate);
            oMainModel.setProperty("/header/doc_date", sCurrentDate);

            // Establecer el modelo mainModel
            this.getView().setModel(oMainModel, "mainModel");
            this.getOwnerComponent().setModel(oMainModel, "mainModel");

            // Crear e inicializar odataModel con localData.json
            var oODataModel = new JSONModel();
            try {
                oODataModel.loadData("localService/localData.json", {}, false);
                this.getView().setModel(oODataModel, "odataModel");
                this.getOwnerComponent().setModel(oODataModel, "odataModel");
                console.log("Datos cargados en odataModel:", oODataModel.getData());
            } catch (oError) {
                console.error("Error al cargar localData.json:", oError);
                MessageToast.show("Error al cargar datos locales, usando datos vacíos");
                oODataModel.setData({ reservations: [], orders: [] });
                this.getView().setModel(oODataModel, "odataModel");
                this.getOwnerComponent().setModel(oODataModel, "odataModel");
            }

            // Forzar posición válida para MessageToast
            MessageToast._mSettings = MessageToast._mSettings || {};
            MessageToast._mSettings.my = "center center";
            MessageToast._mSettings.at = "center center";

            // Inicializar router
            var oRouter = this.getOwnerComponent().getRouter();
            if (oRouter) {
                oRouter.getRoute("RouteMain").attachPatternMatched(this._onObjectMatched, this);
            } else {
                console.error("Router no encontrado en Main.onInit");
                MessageToast.show("Error: Router no encontrado");
            }
        },

        /**
         * Maneja la navegación a la vista Main, reinicia los campos y actualiza la visibilidad.
         */
        _onObjectMatched: function () {
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en _onObjectMatched");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            // Reiniciar campos
            oModel.setProperty("/header/reference_type", "");
            oModel.setProperty("/header/reserv_no", "");
            oModel.setProperty("/header/res_item", "");
            oModel.setProperty("/header/orderid", "");
            oModel.setProperty("/header/move_type", "");
            oModel.setProperty("/header/ref_doc_no", "");
            oModel.setProperty("/header/header_txt", "");

            // Actualizar visibilidad de campos
            this._updateFieldVisibility("");
            oModel.refresh(true);

            // Limpiar estilos de validación
            this._clearRequiredFieldStyles();
        },

        /**
         * Maneja el cambio en la selección del tipo de referencia (reserva, orden, otros).
         */
        onReferenceTypeChange: function (oEvent) {
            var oSelect = oEvent.getSource();
            var sSelectedKey = oSelect.getSelectedKey();
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onReferenceTypeChange");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            // Actualizar tipo de referencia y limpiar campos relacionados
            oModel.setProperty("/header/reference_type", sSelectedKey);
            oModel.setProperty("/header/reserv_no", "");
            oModel.setProperty("/header/res_item", "");
            oModel.setProperty("/header/orderid", "");
            oModel.setProperty("/header/move_type", "");
            oModel.refresh(true);

            // Actualizar visibilidad de campos
            this._updateFieldVisibility(sSelectedKey);
            MessageToast.show("Seleccionaste: " + (sSelectedKey || "Ninguna opción"));
            this._clearRequiredFieldStyles();

            // Depuración
            console.log("SelectedKey:", sSelectedKey);
            console.log("Modelo después de cambio:", oModel.getData());
        },

        /**
         * Actualiza la visibilidad de los campos según el tipo de referencia seleccionado.
         * @param {string} sReferenceType - Tipo de referencia (reserva, orden, otros)
         */
        _updateFieldVisibility: function (sReferenceType) {
            var oView = this.getView();
            var oContainer = oView.byId("claseMovimientoContainer");

            if (!oContainer) {
                console.error("Contenedor claseMovimientoContainer no encontrado");
                MessageToast.show("Error: Contenedor claseMovimientoContainer no encontrado");
                return;
            }

            // Mostrar u ocultar el fragmento ClaseMovimiento
            oContainer.removeAllItems();
            if (sReferenceType === "otros") {
                Fragment.load({
                    id: oView.getId(),
                    name: "logaligroup.mapeobapi.fragments.ClaseMovimiento",
                    controller: this
                }).then(function (oFragment) {
                    oContainer.addItem(oFragment);
                    oView.invalidate();
                }.bind(this)).catch(function (oError) {
                    console.error("Error al cargar ClaseMovimientoFragment:", oError);
                    MessageToast.show("Error al cargar el fragmento ClaseMovimiento");
                });
            }
        },

        /**
         * Maneja el cambio en el número de reserva y consulta el MOVE_TYPE desde el backend.
         */
        onReservNoChange: function (oEvent) {
            var sReservNo = oEvent.getSource().getValue();
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onReservNoChange");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            if (!sReservNo) {
                oModel.setProperty("/header/move_type", "");
                oModel.setProperty("/header/res_item", "");
                return;
            }

            // Validar la reserva en el backend
            this._validateReservation(sReservNo).then(function (oReservation) {
                oModel.setProperty("/header/move_type", oReservation.move_type || "");
                oModel.setProperty("/header/res_item", oReservation.res_item || "");
                MessageToast.show("Reserva validada: MOVE_TYPE = " + (oReservation.move_type || "No encontrado"));
            }).catch(function (oError) {
                MessageToast.show("Error al validar la reserva: " + oError.message);
                oModel.setProperty("/header/move_type", "");
                oModel.setProperty("/header/res_item", "");
            });
        },

        /**
         * Abre un diálogo de ayuda de búsqueda para el número de reserva.
         */
        onReservNoValueHelp: function () {
            var oView = this.getView();
            var oModel = this.getView().getModel("odataModel");

            if (!oModel) {
                console.error("Modelo odataModel no disponible");
                MessageToast.show("Error: No se puede acceder al modelo de datos");
                return;
            }

            if (!this._oReservDialog) {
                this._oReservDialog = new Dialog({
                    title: "{i18n>seleccionarReserva}",
                    content: [
                        new Table({
                            id: oView.createId("reservTable"),
                            mode: "SingleSelectMaster",
                            columns: [
                                new Column({ header: new Text({ text: "{i18n>numeroReserva}" }) }),
                                new Column({ header: new Text({ text: "{i18n>posicion}" }) }),
                                new Column({ header: new Text({ text: "{i18n>moveType}" }) })
                            ],
                            items: {
                                path: "/reservations",
                                template: new ColumnListItem({
                                    cells: [
                                        new Text({ text: "{RESERV_NO}" }),
                                        new Text({ text: "{RES_ITEM}" }),
                                        new Text({ text: "{MOVE_TYPE}" })
                                    ],
                                    press: function (oEvent) {
                                        var oContext = oEvent.getSource().getBindingContext("odataModel");
                                        var oMainModel = this.getView().getModel("mainModel");
                                        oMainModel.setProperty("/header/reserv_no", oContext.getProperty("RESERV_NO"));
                                        oMainModel.setProperty("/header/res_item", oContext.getProperty("RES_ITEM"));
                                        oMainModel.setProperty("/header/move_type", oContext.getProperty("MOVE_TYPE"));
                                        this._oReservDialog.close();
                                        MessageToast.show("Reserva seleccionada: " + oContext.getProperty("RESERV_NO"));
                                    }.bind(this)
                                })
                            }
                        })
                    ],
                    beginButton: new Button({
                        text: "{i18n>cerrar}",
                        press: function () {
                            this._oReservDialog.close();
                        }.bind(this)
                    }),
                    afterClose: function () {
                        this._oReservDialog.destroy();
                        this._oReservDialog = null;
                    }.bind(this)
                });
                oView.addDependent(this._oReservDialog);
            }

            this._oReservDialog.open();
        },

        /**
         * Maneja el cambio en el número de orden y consulta el MOVE_TYPE desde el backend.
         */
        onOrderIdChange: function (oEvent) {
            var sOrderId = oEvent.getSource().getValue();
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onOrderIdChange");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            if (!sOrderId) {
                oModel.setProperty("/header/move_type", "");
                return;
            }

            // Validar la orden en el backend
            this._validateOrder(sOrderId).then(function (oOrder) {
                oModel.setProperty("/header/move_type", oOrder.move_type || "");
                MessageToast.show("Orden validada: MOVE_TYPE = " + (oOrder.move_type || "No encontrado"));
            }).catch(function (oError) {
                MessageToast.show("Error al validar la orden: " + oError.message);
                oModel.setProperty("/header/move_type", "");
            });
        },

        /**
         * Abre un diálogo de ayuda de búsqueda para el número de orden.
         */
        onOrderIdValueHelp: function () {
            var oView = this.getView();
            var oModel = this.getView().getModel("odataModel");

            if (!oModel) {
                console.error("Modelo odataModel no disponible");
                MessageToast.show("Error: No se puede acceder al modelo de datos");
                return;
            }

            if (!this._oOrderDialog) {
                this._oOrderDialog = new Dialog({
                    title: "{i18n>seleccionarOrden}",
                    content: [
                        new Table({
                            id: oView.createId("orderTable"),
                            mode: "SingleSelectMaster",
                            columns: [
                                new Column({ header: new Text({ text: "{i18n>numeroOrden}" }) }),
                                new Column({ header: new Text({ text: "{i18n>moveType}" }) })
                            ],
                            items: {
                                path: "/orders",
                                template: new ColumnListItem({
                                    cells: [
                                        new Text({ text: "{ORDERID}" }),
                                        new Text({ text: "{MOVE_TYPE}" })
                                    ],
                                    press: function (oEvent) {
                                        var oContext = oEvent.getSource().getBindingContext("odataModel");
                                        var oMainModel = this.getView().getModel("mainModel");
                                        oMainModel.setProperty("/header/orderid", oContext.getProperty("ORDERID"));
                                        oMainModel.setProperty("/header/move_type", oContext.getProperty("MOVE_TYPE"));
                                        this._oOrderDialog.close();
                                        MessageToast.show("Orden seleccionada: " + oContext.getProperty("ORDERID"));
                                    }.bind(this)
                                })
                            }
                        })
                    ],
                    beginButton: new Button({
                        text: "{i18n>cerrar}",
                        press: function () {
                            this._oOrderDialog.close();
                        }.bind(this)
                    }),
                    afterClose: function () {
                        this._oOrderDialog.destroy();
                        this._oOrderDialog = null;
                    }.bind(this)
                });
                oView.addDependent(this._oOrderDialog);
            }

            this._oOrderDialog.open();
        },

        /**
         * Valida una reserva en el backend y obtiene el MOVE_TYPE.
         * @param {string} sReservNo - Número de reserva
         * @returns {Promise} - Promesa con los datos de la reserva
         */
        _validateReservation: function (sReservNo) {
            var oODataModel = this.getView().getModel("odataModel");
            if (!oODataModel) {
                return Promise.reject(new Error("Modelo odataModel no disponible"));
            }
            return new Promise(function (resolve, reject) {
                var aReservations = oODataModel.getProperty("/reservations") || [];
                var oReservation = aReservations.find(function (item) {
                    return item.RESERV_NO === sReservNo;
                });
                if (oReservation) {
                    resolve({
                        move_type: oReservation.MOVE_TYPE || "",
                        res_item: oReservation.RES_ITEM || ""
                    });
                } else {
                    reject(new Error("Reserva no encontrada: " + sReservNo));
                }
            });
        },

        /**
         * Valida una orden en el backend y obtiene el MOVE_TYPE.
         * @param {string} sOrderId - Número de orden
         * @returns {Promise} - Promesa con los datos de la orden
         */
        _validateOrder: function (sOrderId) {
            var oODataModel = this.getView().getModel("odataModel");
            if (!oODataModel) {
                return Promise.reject(new Error("Modelo odataModel no disponible"));
            }
            return new Promise(function (resolve, reject) {
                var aOrders = oODataModel.getProperty("/orders") || [];
                var oOrder = aOrders.find(function (item) {
                    return item.ORDERID === sOrderId;
                });
                if (oOrder) {
                    resolve({
                        move_type: oOrder.MOVE_TYPE || ""
                    });
                } else {
                    reject(new Error("Orden no encontrada: " + sOrderId));
                }
            });
        },

        /**
         * Maneja el cambio en los campos de fecha.
         */
        onDateChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sValue = oDatePicker.getValue();
            var oModel = this.getView().getModel("mainModel");
            var sProperty = oDatePicker.getId().includes("fechaDoc") ? "/header/doc_date" : "/header/pstng_date";
            oModel.setProperty(sProperty, sValue);
            oDatePicker.removeStyleClass("requiredFieldEmpty");
        },

        /**
         * Maneja el cambio en la selección de MOVE_TYPE en el fragmento ClaseMovimiento.
         */
        onMoveTypeChange: function (oEvent) {
            var sSelectedKey = oEvent.getSource().getSelectedKey();
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onMoveTypeChange");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }
            oModel.setProperty("/header/move_type", sSelectedKey);
            MessageToast.show("Clase de movimiento seleccionada: " + sSelectedKey);
        },

        /**
         * Valida los datos de cabecera y navega a la vista de ítems.
         */
        onNext: function () {
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onNext");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            var oHeader = oModel.getProperty("/header");
            var bHasErrors = false;

            // Validar tipo de referencia
            if (!oHeader.reference_type) {
                MessageToast.show("Por favor, selecciona un tipo de referencia");
                this.byId("opcionesSelect").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }

            // Validar reserva
            if (oHeader.reference_type === "reserva") {
                if (!oHeader.reserv_no) {
                    MessageToast.show("Por favor, ingresa el número de reserva");
                    this.byId("numeroReservaContainer").getItems()[1].addStyleClass("requiredFieldEmpty");
                    bHasErrors = true;
                }
                if (!oHeader.res_item) {
                    MessageToast.show("Por favor, ingresa la posición de reserva");
                    this.byId("posicionReservaContainer").getItems()[1].addStyleClass("requiredFieldEmpty");
                    bHasErrors = true;
                }
            }

            // Validar orden
            if (oHeader.reference_type === "orden" && !oHeader.orderid) {
                MessageToast.show("Por favor, ingresa el número de orden");
                this.byId("numeroOrdenContainer").getItems()[1].addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }

            // Validar MOVE_TYPE para "otros"
            if (oHeader.reference_type === "otros" && !oHeader.move_type) {
                MessageToast.show("Por favor, selecciona una clase de movimiento");
                var oSelect = this.byId("claseMovimientoContainer").getItems()[0]?.getItems()[1];
                if (oSelect) oSelect.addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }

            // Validar fechas
            if (!oHeader.doc_date) {
                MessageToast.show("Por favor, completa la fecha de documento");
                this.byId("fechaDoc").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }
            if (!oHeader.pstng_date) {
                MessageToast.show("Por favor, completa la fecha de contabilización");
                this.byId("fechaContabilizacion").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }

            if (!bHasErrors) {
                MessageToast.show("Validación exitosa, navegando a ítems");
                this.getOwnerComponent().getRouter().navTo("RouteItem");
            }
        },

        /**
         * Limpia los estilos de validación de los campos requeridos.
         */
        _clearRequiredFieldStyles: function () {
            var oView = this.getView();
            ["opcionesSelect", "numeroReservaContainer", "posicionReservaContainer", "numeroOrdenContainer", "claseMovimientoContainer", "fechaDoc", "fechaContabilizacion"].forEach(function (sId) {
                var oControl = oView.byId(sId);
                if (oControl) {
                    oControl.removeStyleClass("requiredFieldEmpty");
                    if (sId.endsWith("Container")) {
                        var oInput = oControl.getItems()[1];
                        if (oInput) oInput.removeStyleClass("requiredFieldEmpty");
                    }
                }
            });
        }
    });
});