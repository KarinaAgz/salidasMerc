sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, JSONModel, Dialog, Button, Table, Column, ColumnListItem, Text, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.Item", {
        /**
         * Inicializa el controlador y verifica los modelos.
         */
        onInit: function () {
            var oComponent = this.getOwnerComponent();
            var oModel = oComponent.getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en Item.onInit");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            // Inicializar router
            var oRouter = oComponent.getRouter();
            if (oRouter) {
                oRouter.getRoute("RouteItem").attachPatternMatched(this._onObjectMatched, this);
            }
        },

        /**
         * Maneja la navegación a la vista Item y reinicia los campos.
         */
        _onObjectMatched: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            if (!oModel) {
                console.error("Modelo mainModel no encontrado en _onObjectMatched");
                MessageToast.show("Error: Modelo mainModel no encontrado");
                return;
            }

            // Reiniciar el ítem actual
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

            // Actualizar visibilidad según MOVE_TYPE
            var sMoveType = oModel.getProperty("/header/move_type");
            console.log("MOVE_TYPE detectado:", sMoveType); // Depuración
            this.getView().byId("centroCosto").setVisible(sMoveType === "201" || sMoveType === "551");
            this.getView().byId("orden").setVisible(sMoveType === "261");
            this.getView().byId("motivo").setVisible(sMoveType === "551");

            // Simular carga de motivos si es 551
            if (sMoveType === "551") {
                this._loadMoveReasons();
            }

            oModel.refresh(true);
        },

        /**
         * Simula la carga de motivos de movimiento para MOVE_TYPE = 551.
         */
        _loadMoveReasons: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            var aMotivos = [{
                key: "",
                text: "Selecciona..."
            }, {
                key: "0001",
                text: "0001 - Motivo de prueba"
            }, {
                key: "0002",
                text: "0002 - Otro motivo"
            }];
            oModel.setProperty("/motivos", aMotivos);
            MessageToast.show("Motivos cargados correctamente (simulado)");
        },

        /**
         * Maneja el cambio en la selección del motivo del movimiento.
         */
        onMoveReasChange: function (oEvent) {
            var sSelectedKey = oEvent.getSource().getSelectedKey();
            var oModel = this.getOwnerComponent().getModel("mainModel");
            oModel.setProperty("/currentItem/move_reas", sSelectedKey);
            MessageToast.show("Motivo seleccionado: " + sSelectedKey);
        },

        /**
         * Valida y guarda el ítem actual en la lista de ítems.
         */
        onSaveItem: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            var oCurrentItem = oModel.getProperty("/currentItem");
            var sMoveType = oModel.getProperty("/header/move_type");

            // Validaciones
            var bHasErrors = false;
            var aFields = [
                { id: "material", value: oCurrentItem.material, message: "Ingresa el material" },
                { id: "planta", value: oCurrentItem.plant, message: "Ingresa el centro" },
                { id: "almacen", value: oCurrentItem.stge_loc, message: "Ingresa el almacén" },
                { id: "cantidad", value: oCurrentItem.entry_qnt, message: "Ingresa la cantidad" },
                { id: "unidadMedida", value: oCurrentItem.entry_uom, message: "Ingresa la unidad de medida" },
                { id: "centroCosto", value: oCurrentItem.costcenter, message: "Ingresa el centro de costo", condition: sMoveType === "201" || sMoveType === "551" },
                { id: "orden", value: oCurrentItem.orderid, message: "Ingresa la orden", condition: sMoveType === "261" },
                { id: "motivo", value: oCurrentItem.move_reas, message: "Selecciona el motivo", condition: sMoveType === "551" },
            ];

            aFields.forEach(function (oField) {
                if (!oField.value && (!oField.condition || oField.condition)) {
                    MessageToast.show(oField.message);
                    var oControl = this.getView().byId(oField.id);
                    if (oControl) oControl.addStyleClass("error");
                    bHasErrors = true;
                } else {
                    var oControl = this.getView().byId(oField.id);
                    if (oControl) oControl.removeStyleClass("error");
                }
            }.bind(this));

            if (bHasErrors) {
                return;
            }

            // Simulación de validaciones locales
            var aPromises = [
                this._validateMaterial(oCurrentItem.material),
                this._validatePlant(oCurrentItem.plant),
                this._validateStorageLocation(oCurrentItem.stge_loc, oCurrentItem.plant),
                this._validateUnitOfMeasure(oCurrentItem.entry_uom)
            ].filter(Boolean);

            Promise.all(aPromises).then(function () {
                // Guardar ítem
                var oItems = oModel.getProperty("/items") || [];
                oItems.push(Object.assign({}, oCurrentItem));
                oModel.setProperty("/items", oItems);

                // Limpiar formulario
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
            }.bind(this)).catch(function (oError) {
                MessageToast.show("Error al validar datos maestros: " + oError.message);
            });
        },

        // Simulaciones de validaciones locales
        _validateMaterial: function (sMaterial) {
            return new Promise(function (resolve, reject) {
                if (sMaterial) {
                    resolve();
                } else {
                    reject(new Error("Material no válido"));
                }
            });
        },
        _validatePlant: function (sPlant) {
            return new Promise(function (resolve, reject) {
                if (sPlant) {
                    resolve();
                } else {
                    reject(new Error("Centro no válido"));
                }
            });
        },
        _validateStorageLocation: function (sStorageLoc, sPlant) {
            return new Promise(function (resolve, reject) {
                if (sStorageLoc && sPlant) {
                    resolve();
                } else {
                    reject(new Error("Almacén no válido"));
                }
            });
        },
        _validateUnitOfMeasure: function (sUom) {
            return new Promise(function (resolve, reject) {
                if (sUom) {
                    resolve();
                } else {
                    reject(new Error("Unidad de medida no válida"));
                }
            });
        },

        /**
         * Limpia el formulario para una nueva entrada.
         */
        onNewEntry: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
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
            MessageToast.show("Formulario listo para nueva entrada");
            this._clearFieldErrors();
        },

        /**
         * Cancela la entrada y regresa a la vista principal.
         */
        onCancel: function () {
            this.onNewEntry();
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        /**
         * Elimina un ítem seleccionado de la tabla.
         */
        onDeleteItem: function () {
            var oTable = this.getView().byId("itemsTable");
            var oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                MessageToast.show("Selecciona un ítem para eliminar");
                return;
            }

            var oModel = this.getOwnerComponent().getModel("mainModel");
            var oItems = oModel.getProperty("/items");
            var iIndex = oTable.indexOfItem(oSelectedItem);
            oItems.splice(iIndex, 1);
            oModel.setProperty("/items", oItems);
            MessageToast.show("Ítem eliminado");
        },

        /**
         * Envía los datos al backend (simulación local).
         */
        onSubmit: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            var oHeader = oModel.getProperty("/header");
            var oItems = oModel.getProperty("/items");

            if (!oItems.length) {
                MessageToast.show("Agrega al menos un ítem");
                return;
            }

            MessageToast.show("Movimiento creado exitosamente (simulación local)");
            this._resetModel();
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        /**
         * Limpia los estilos de error de los campos.
         */
        _clearFieldErrors: function () {
            ["material", "planta", "almacen", "cantidad", "unidadMedida", "centroCosto", "orden", "motivo"].forEach(function (sId) {
                var oControl = this.getView().byId(sId);
                if (oControl) oControl.removeStyleClass("error");
            }.bind(this));
        },

        /**
         * Reinicia el modelo después de un envío exitoso.
         */
        _resetModel: function () {
            var oModel = this.getOwnerComponent().getModel("mainModel");
            oModel.loadData("localService/initialData.json", {}, false);
            var sCurrentDate = new Date().toISOString().split("T")[0];
            oModel.setProperty("/header/pstng_date", sCurrentDate);
            oModel.setProperty("/header/doc_date", sCurrentDate);
        }
    });
});