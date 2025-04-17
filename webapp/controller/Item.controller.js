sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.Item", {
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            if (oRouter) {
                console.log("Router inicializado en Item.onInit");
            } else {
                console.error("Router no encontrado en Item.onInit");
            }

            // Definir las opciones para el motivo (moveReasons)
            var oMoveReasonsData = {
                items: [
                    { key: "0001", text: "Obsolescencia" },
                    { key: "0002", text: "Defectuoso" },
                    { key: "0003", text: "Fin de vida útil" },
                    { key: "0004", text: "Otros" }
                ]
            };
            var oMoveReasonsModel = new JSONModel(oMoveReasonsData);
            this.getView().setModel(oMoveReasonsModel, "moveReasons");

            // Obtener el modelo mainModel desde el componente
            var oMainModel = this.getOwnerComponent().getModel("mainModel");
            if (!oMainModel) {
                console.error("Modelo mainModel no encontrado en Item.onInit desde el componente");
                return;
            }

            // Verificar y precargar un valor por defecto
            if (oMainModel.getProperty("/header/move_type") === "551" && !oMainModel.getProperty("/currentItem/move_reas")) {
                oMainModel.setProperty("/currentItem/move_reas", "0001"); // Valor por defecto
            }

            // Asociar el modelo a la vista por si no se propagó
            this.getView().setModel(oMainModel, "mainModel");
        },

        onMaterialScan: function (oEvent) {
            var sScannedValue = oEvent.getSource().getValue();
            if (!sScannedValue) {
                MessageToast.show("Por favor, escanea un código de barras válido");
                return;
            }

            // Validación básica: Asegurarse de que el código tenga el formato esperado
            if (sScannedValue.length < 8 || sScannedValue.length > 12) {
                MessageToast.show("El código de barras debe tener entre 8 y 12 caracteres");
                return;
            }

            console.log("Código de barras escaneado:", sScannedValue);
            MessageToast.show("Código escaneado: " + sScannedValue);
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
            if (oModel.getProperty("/header/move_type") === "551" && !oCurrentItem.move_reas) {
                MessageToast.show("Por favor, selecciona un motivo");
                this.byId("moveReas").addStyleClass("requiredFieldEmpty");
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

        onEntryUomChange: function (oEvent) {
            var sValue = oEvent.getSource().getValue();
            console.log("Unidad de medida cambiada:", sValue);
        }
    });
});