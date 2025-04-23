sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel" 
], function (Controller, MessageToast, Fragment, JSONModel) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.Main", {
        _oClaseMovimientoFragmentControls: null,

        onInit: function () {
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en Main.onInit, inicializando localmente");
                oModel = new JSONModel({
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
                    motivos: [
                        { key: "", text: "Seleccionar..." },
                        { key: "0001", text: "Obsolescencia" },
                        { key: "0002", text: "Defectuoso" },
                        { key: "0003", text: "Fin de Vida" },
                        { key: "0004", text: "Otros Motivos" }
                    ]
                });
                oModel.setDefaultBindingMode("TwoWay");
                this.getView().setModel(oModel, "mainModel");
                this.getOwnerComponent().setModel(oModel, "mainModel"); // Propagar al componente
            }
            console.log("Modelo inicializado:", oModel.getData());

            this._updateFieldVisibility("");

            var oRouter = this.getOwnerComponent().getRouter();
            if (oRouter) {
                oRouter.getRoute("RouteMain").attachPatternMatched(this._onObjectMatched, this);
                console.log("Router inicializado en Main.onInit");
            } else {
                console.error("Router no encontrado en Main.onInit");
                MessageToast.show("Error: Router no encontrado");
            }
        },

        _onObjectMatched: function () {
            console.log("Navegación a vista Main exitosa");
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en _onObjectMatched");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }
            console.log("Modelo al regresar a Main:", oModel.getData());

            this._updateFieldVisibility(oModel.getProperty("/header/reference_type"));

            oModel.refresh(true);

            var oView = this.getView();
            var oSelect = oView.byId("opcionesSelect");
            if (oSelect) {
                oSelect.setSelectedKey("");
            }

            var oFechaDoc = oView.byId("fechaDoc");
            if (oFechaDoc) {
                oFechaDoc.setValue(new Date().toISOString().split("T")[0]);
            }

            var oFechaContabilizacion = oView.byId("fechaContabilizacion");
            if (oFechaContabilizacion) {
                oFechaContabilizacion.setValue(new Date().toISOString().split("T")[0]);
            }

            var oReferencia = oView.byId("referenciaReserva");
            if (oReferencia) {
                oReferencia.setValue("");
            }

            var oTextoCabecera = oView.byId("textoCabecera");
            if (oTextoCabecera) {
                oTextoCabecera.setValue("");
            }

            var oNumeroReserva = oView.byId("numeroReservaFragment")?.getItems()[1];
            if (oNumeroReserva) {
                oNumeroReserva.setValue("");
            }

            var oPosicionReserva = oView.byId("posicionReservaFragment")?.getItems()[1];
            if (oPosicionReserva) {
                oPosicionReserva.setValue("");
            }

            var oNumeroOrden = oView.byId("numeroOrdenFragment")?.getItems()[1];
            if (oNumeroOrden) {
                oNumeroOrden.setValue("");
            }

            this._clearRequiredFieldStyles();
        },

        onSelectionChange: function (oEvent) {
            console.log("onSelectionChange ejecutado");
            var oSelect = oEvent.getSource();
            var sSelectedKey = oSelect.getSelectedKey();
            oSelect.setSelectedKey(sSelectedKey); // Forzar la selección
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onSelectionChange");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }
            console.log("Selected reference_type:", sSelectedKey);
            oModel.setProperty("/header/reference_type", sSelectedKey);
            oModel.setProperty("/header/reserv_no", "");
            oModel.setProperty("/header/res_item", "");
            oModel.setProperty("/header/orderid", "");
            oModel.setProperty("/header/move_type", "");
            oModel.refresh(true);

            this._updateFieldVisibility(sSelectedKey);

            console.log("Modelo después de cambiar selección:", oModel.getData());
            console.log("Debería mostrar Número de Orden:", oModel.getProperty("/header/reference_type") === "orden");
            console.log("Debería mostrar Número de Reserva:", oModel.getProperty("/header/reference_type") === "reserva");
            console.log("Debería mostrar Clase de Movimiento:", oModel.getProperty("/header/reference_type") === "otros");
            MessageToast.show("Seleccionaste: " + sSelectedKey);
            this._clearRequiredFieldStyles();
        },

        _updateFieldVisibility: function (sReferenceType) {
            var oView = this.getView();

            console.log("Valor de sReferenceType en _updateFieldVisibility:", sReferenceType);

            var bIsOtros = sReferenceType === "otros";
            console.log("bIsOtros:", bIsOtros);

            var oContainer = oView.byId("claseMovimientoContainer");
            if (!oContainer) {
                console.error("Contenedor claseMovimientoContainer no encontrado en Main.view.xml");
                MessageToast.show("Error: Contenedor claseMovimientoContainer no encontrado");
                return;
            }

            if (bIsOtros) {
                if (this._oClaseMovimientoFragmentControls) {
                    oContainer.removeAllItems();
                    this._oClaseMovimientoFragmentControls.forEach(function (oControl) {
                        oContainer.addItem(oControl);
                    });
                    console.log("ClaseMovimientoFragment reutilizado");
                } else {
                    Fragment.load({
                        id: oView.getId(),
                        name: "logaligroup.mapeobapi.fragments.ClaseMovimiento",
                        controller: this
                    }).then(function (oFragment) {
                        var aControls = oFragment;
                        if (Array.isArray(aControls)) {
                            oContainer.removeAllItems();
                            aControls.forEach(function (oControl) {
                                oContainer.addItem(oControl);
                            });
                            this._oClaseMovimientoFragmentControls = aControls;
                            console.log("ClaseMovimientoFragment cargado dinámicamente");
                        } else {
                            console.error("El fragmento no contiene controles válidos");
                        }
                    }.bind(this)).catch(function (oError) {
                        console.error("Error al cargar ClaseMovimientoFragment:", oError);
                        MessageToast.show("Error al cargar el fragmento ClaseMovimiento");
                    });
                }
            } else {
                oContainer.removeAllItems();
                console.log("ClaseMovimientoFragment removido");
            }

            oView.invalidate();
        },

        onReservNoChange: function (oEvent) {
            var sReservNo = oEvent.getSource().getValue();
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onReservNoChange");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }
            var sMoveType = this._simulateMoveTypeForReservation(sReservNo);
            oModel.setProperty("/header/move_type", sMoveType);
            if (sMoveType) {
                MessageToast.show("Move Type obtenido para la reserva: " + sMoveType);
            } else {
                MessageToast.show("Reserva no encontrada");
            }
        },

        onOrderIdChange: function (oEvent) {
            var sOrderId = oEvent.getSource().getValue();
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onOrderIdChange");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }
            console.log("Número de Orden ingresado:", sOrderId);
            console.log("Modelo /header/orderid después de ingreso:", oModel.getProperty("/header/orderid"));

            var sMoveType = this._simulateMoveTypeForOrder(sOrderId);
            oModel.setProperty("/header/move_type", sMoveType);
            if (sMoveType) {
                MessageToast.show("Move Type obtenido para la orden: " + sMoveType);
            } else {
                MessageToast.show("Orden no encontrada");
            }
        },

        _simulateMoveTypeForReservation: function (sReservNo) {
            var oReservationMoveTypes = {
                "RES001": "201",
                "RES002": "261",
                "RES003": "551"
            };
            return oReservationMoveTypes[sReservNo] || "";
        },

        _simulateMoveTypeForOrder: function (sOrderId) {
            var oOrderMoveTypes = {
                "ORD001": "261",
                "ORD002": "201",
                "ORD003": "551"
            };
            return oOrderMoveTypes[sOrderId] || "";
        },

        onNext: function () {
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onNext");
                MessageToast.show("Error: Modelo no encontrado");
                return;
            }

            var oHeader = oModel.getProperty("/header");
            if (!oHeader) {
                MessageToast.show("Error: Datos del header no encontrados");
                return;
            }

            console.log("Estado del modelo antes de la validación:", oHeader);
            console.log("Move Type antes de navegar a Item:", oHeader.move_type);

            this._clearRequiredFieldStyles();

            var bHasErrors = false;

            if (!oHeader.reference_type) {
                MessageToast.show("Por favor, selecciona un tipo de referencia");
                this.byId("opcionesSelect").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }

            if (oHeader.reference_type === "reserva") {
                var oNumeroReservaFragment = this.getView().byId("numeroReservaFragment");
                var oPosicionReservaFragment = this.getView().byId("posicionReservaFragment");
                var oReservNo = oNumeroReservaFragment?.getItems()[1];
                var oResItem = oPosicionReservaFragment?.getItems()[1];

                if (!oHeader.reserv_no) {
                    MessageToast.show("Por favor, completa el número de reserva");
                    if (oReservNo) oReservNo.addStyleClass("requiredFieldEmpty");
                    bHasErrors = true;
                }
                if (!oHeader.res_item) {
                    MessageToast.show("Por favor, completa la posición de reserva");
                    if (oResItem) oResItem.addStyleClass("requiredFieldEmpty");
                    bHasErrors = true;
                }
            }

            if (oHeader.reference_type === "orden") {
                var oNumeroOrdenFragment = this.getView().byId("numeroOrdenFragment");
                var oOrderId = oNumeroOrdenFragment?.getItems()[1];

                console.log("Validando Número de Orden:", oHeader.orderid);
                if (!oHeader.orderid || (typeof oHeader.orderid === "string" && oHeader.orderid.trim() === "")) {
                    MessageToast.show("Por favor, ingresa el número de orden");
                    if (oOrderId) oOrderId.addStyleClass("requiredFieldEmpty");
                    bHasErrors = true;
                }
            }

            if (oHeader.reference_type === "otros" && !oHeader.move_type) {
                MessageToast.show("Por favor, selecciona una clase de movimiento");
                bHasErrors = true;
            }

            if (!bHasErrors) {
                oModel.updateBindings(true);
                console.log("Modelo antes de navegar:", oModel.getData());
                MessageToast.show("Validación exitosa, navegando a la vista de ítems");
                this.getOwnerComponent().getRouter().navTo("RouteItem");
            }
        },

        _clearRequiredFieldStyles: function () {
            var oView = this.getView();
            var aFragments = [
                "opcionesSelect",
                "claseMovimientoContainer",
                "numeroReservaFragment",
                "posicionReservaFragment",
                "numeroOrdenFragment"
            ];

            aFragments.forEach(function (sFragmentId) {
                if (sFragmentId === "opcionesSelect") {
                    var oField = this.byId(sFragmentId);
                    if (oField) {
                        oField.removeStyleClass("requiredFieldEmpty");
                    }
                } else {
                    var oFragment = this.getView().byId(sFragmentId);
                    var oField = oFragment?.getItems()[1];
                    if (oField) {
                        oField.removeStyleClass("requiredFieldEmpty");
                    }
                }
            }.bind(this));
        },

        onMoveTypeChange: function (oEvent) {
            var oSelect = oEvent.getSource();
            var sSelectedKey = oSelect.getSelectedKey();
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en onMoveTypeChange");
                MessageToast.show("Error: Modelo no encontrado");
                return;
            }

            oModel.setProperty("/header/move_type", sSelectedKey);
            oModel.refresh(true);

            console.log("Move Type seleccionado en ClaseMovimiento:", sSelectedKey);
            console.log("Estado del modelo después de seleccionar move_type:", oModel.getData());
        },
    });
});