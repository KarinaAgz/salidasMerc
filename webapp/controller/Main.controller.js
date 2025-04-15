sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.Main", {
        onInit: function () {
            var oModel = new sap.ui.model.json.JSONModel({
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
                    ver_gr_gi_slip: "3", // Default value
                    ver_gr_gi_slipx: "X" // Default value
                },
                code: {
                    gm_code: "03" // Default value for Goods Issue
                },
                items: [], // Array para las posiciones
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
                }
            });
            this.getView().setModel(oModel, "mainModel");
        },

        onSelectionChange: function (oEvent) {
            var sSelectedKey = oEvent.getSource().getSelectedKey();
            var oModel = this.getView().getModel("mainModel");
            if (oModel) {
                oModel.setProperty("/header/reference_type", sSelectedKey);
                MessageToast.show("Seleccionaste: " + sSelectedKey);
                this._clearRequiredFieldStyles();
            } else {
                MessageToast.show("Error: Modelo no encontrado");
            }
        },

        onNext: function () {
            var oModel = this.getView().getModel("mainModel");
            if (!oModel) {
                MessageToast.show("Error: Modelo no encontrado");
                return;
            }

            var oHeader = oModel.getProperty("/header");
            if (!oHeader) {
                MessageToast.show("Error: Datos del header no encontrados");
                return;
            }

            this._clearRequiredFieldStyles();

            var bHasErrors = false;

            if (!oHeader.reference_type) {
                MessageToast.show("Por favor, selecciona un tipo de referencia");
                this.byId("opcionesSelect").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }

            if (oHeader.reference_type === "reserva") {
                if (!oHeader.reserv_no) {
                    MessageToast.show("Por favor, completa el número de reserva");
                    this.byId("reservNo").addStyleClass("requiredFieldEmpty");
                    bHasErrors = true;
                }
                if (!oHeader.res_item) {
                    MessageToast.show("Por favor, completa la posición de reserva");
                    this.byId("resItem").addStyleClass("requiredFieldEmpty");
                    bHasErrors = true;
                }
            }

            if (oHeader.reference_type === "orden" && !oHeader.orderid) {
                MessageToast.show("Por favor, ingresa el número de orden");
                this.byId("orderId").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }

            if (oHeader.reference_type === "otros" && !oHeader.move_type) {
                MessageToast.show("Por favor, selecciona una clase de movimiento");
                this.byId("claseMovimiento").addStyleClass("requiredFieldEmpty");
                bHasErrors = true;
            }

            if (bHasErrors) {
                return;
            }

            this.getOwnerComponent().getRouter().navTo("item");
        },

        _clearRequiredFieldStyles: function () {
            var aFields = [
                "opcionesSelect",
                "reservNo",
                "resItem",
                "orderId",
                "claseMovimiento"
            ];
            aFields.forEach(function (sFieldId) {
                var oField = this.byId(sFieldId);
                if (oField) {
                    oField.removeStyleClass("requiredFieldEmpty");
                }
            }.bind(this));
        }
    });
});