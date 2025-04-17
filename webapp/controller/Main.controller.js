sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.Main", {
        onInit: function () {
            // Establecer visibilidad inicial
            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (!oModel) {
                MessageToast.show("Error: Modelo mainModel no encontrado en Main.onInit");
                return;
            }
            console.log("Modelo inicializado en Main:", oModel.getData());
            this._updateFieldVisibility("");
        },

        onSelectionChange: function (oEvent) {
            var sSelectedKey = oEvent.getSource().getSelectedKey();
            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (oModel) {
                console.log("Selected reference_type:", sSelectedKey);
                oModel.setProperty("/header/reference_type", sSelectedKey);
                oModel.setProperty("/header/reserv_no", "");
                oModel.setProperty("/header/res_item", "");
                oModel.setProperty("/header/orderid", "");
                oModel.setProperty("/header/move_type", "");
                oModel.refresh(true);

                // Actualizar visibilidad de los campos (solo para Clase de Movimiento)
                this._updateFieldVisibility(sSelectedKey);

                console.log("Modelo después de cambiar selección:", oModel.getData());
                console.log("Debería mostrar Número de Orden:", oModel.getProperty("/header/reference_type") === "orden");
                console.log("Debería mostrar Número de Reserva:", oModel.getProperty("/header/reference_type") === "reserva");
                console.log("Debería mostrar Clase de Movimiento:", oModel.getProperty("/header/reference_type") === "otros");
                MessageToast.show("Seleccionaste: " + sSelectedKey);
                this._clearRequiredFieldStyles();
            } else {
                MessageToast.show("Error: Modelo no encontrado");
            }
        },

        _updateFieldVisibility: function (sReferenceType) {
            var oView = this.getView();

            // Depuración: Confirmar el valor de sReferenceType
            console.log("Valor de sReferenceType en _updateFieldVisibility:", sReferenceType);

            // Fragmentos completos
            var oClaseMovimientoFragment = oView.byId("claseMovimientoFragment");

            // Depuración: Verificar si el fragmento existe
            console.log("ClaseMovimientoFragment encontrado:", !!oClaseMovimientoFragment);

            // Controlar visibilidad
            var bIsOtros = sReferenceType === "otros";

            console.log("bIsOtros:", bIsOtros);

            // Ocultar/mostrar los fragmentos completos
            if (oClaseMovimientoFragment) {
                oClaseMovimientoFragment.setVisible(bIsOtros);
                console.log("ClaseMovimientoFragment visibilidad seteada a:", bIsOtros);
            }

            // Forzar rerenderizado
            oView.invalidate();
        },

        onReservNoChange: function (oEvent) {
            var sReservNo = oEvent.getSource().getValue();
            var oModel = this.getOwnerComponent().getModel("mainModel");
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
            var oModel = this.getOwnerComponent().getModel("mainModel");
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
            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (!oModel) {
                MessageToast.show("Error: Modelo no encontrado");
                return;
            }
        
            var oHeader = oModel.getProperty("/header");
            if (!oHeader) {
                MessageToast.show("Error: Datos del header no encontrados");
                return;
            }
        
            console.log("Estado del modelo antes de la validación:", oHeader);
        
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
                var oClaseMovimientoFragment = this.getView().byId("claseMovimientoFragment");
                var oClaseMovimiento = oClaseMovimientoFragment?.getItems()[1];
        
                MessageToast.show("Por favor, selecciona una clase de movimiento");
                if (oClaseMovimiento) oClaseMovimiento.addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }
        
            if (!bHasErrors) {
                MessageToast.show("Validación exitosa, navegando a la vista de ítems");
                var oRouter = this.getOwnerComponent().getRouter();
                if (!oRouter) {
                    MessageToast.show("Error: Router no encontrado");
                    console.error("Router no inicializado");
                    return;
                }
                try {
                    // Forzar move_type a "551" para asegurar que "Motivo" sea visible
                    oModel.setProperty("/header/move_type", "551"); // Ajuste para mostrar "Motivo"
                    console.log("Intentando navegar a 'RouteItem' con move_type:", oModel.getProperty("/header/move_type"));
                    oRouter.navTo("RouteItem"); // Usa el nombre de la ruta correcto
                    console.log("Navegación iniciada");
                } catch (e) {
                    MessageToast.show("Error al navegar: " + e.message);
                    console.error("Error de navegación:", e);
                }
            }
        },

        _clearRequiredFieldStyles: function () {
            var oView = this.getView();
            var aFragments = [
                "opcionesSelect",
                "claseMovimientoFragment",
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
                    var oField = oFragment?.getItems()[1]; // El control es el segundo elemento (índice 1)
                    if (oField) {
                        oField.removeStyleClass("requiredFieldEmpty");
                    }
                }
            }.bind(this));
        }
    });
});