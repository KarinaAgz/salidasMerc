sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.Main", {
        onInit: function () {
            var oModel = new JSONModel({
                header: {
                    pstng_date: new Date().toISOString().split("T")[0],
                    doc_date: new Date().toISOString().split("T")[0],
                    ref_doc_no: "",
                    header_txt: "",
                    move_type: "",
                    reference_type: ""
                },
                currentItem: {
                    material: "", entry_qnt: "", entry_uom: "", batch: "",
                    plant: "", stge_loc: "", costcenter: "", orderid: "",
                    move_reas: "", position_txt: ""
                },
                items: [],
                itemCount: 0 // Inicializamos el contador
            });
            this.getView().setModel(oModel, "mainModel");
            var oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Cabecera");
            this._loadMoveReasons();
        },

        onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "Orden Completa" && !this.getView().getModel("mainModel").getProperty("/items").length) {
                MessageToast.show("Agrega al menos un ítem antes de ver la orden completa");
                oEvent.preventDefault();
                var oTabBar = this.getView().byId("mainTabBar");
                if (oTabBar) oTabBar.setSelectedKey("Datos de Posición");
            }
        },

        onReferenceTypeChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/header/reference_type", sKey);
            oModel.setProperty("/header/move_type", "");
            this.getView().byId("moveTypeManual").setValue("");
            this.getView().byId("refDocNo").setValue("");
            if (sKey === "reserva") oModel.setProperty("/header/move_type", "201");
            else if (sKey === "orden") oModel.setProperty("/header/move_type", "601");
            else if (sKey === "otro") oModel.setProperty("/header/move_type", "");
            this._updatePositionFields();
        },

        _loadMoveReasons: function () {
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/motivos", [
                { key: "", text: "Selecciona..." },
                { key: "0001", text: "Motivo 1" },
                { key: "0002", text: "Motivo 2" }
            ]);
        },

        _updatePositionFields: function () {
            var oModel = this.getView().getModel("mainModel");
            var sMoveType = oModel.getProperty("/header/move_type");
            var oView = this.getView();
            oView.byId("costcenter").setValue("");
            oView.byId("orderid").setValue("");
            oView.byId("moveReas").setValue("");
            if (sMoveType === "201" || sMoveType === "551") {
                oView.byId("costcenter").setVisible(true);
                oView.byId("orderid").setVisible(false);
                oView.byId("moveReas").setVisible(sMoveType === "551");
            } else if (sMoveType === "601" || sMoveType === "261") {
                oView.byId("costcenter").setVisible(false);
                oView.byId("orderid").setVisible(true);
                oView.byId("moveReas").setVisible(false);
            } else {
                oView.byId("costcenter").setVisible(false);
                oView.byId("orderid").setVisible(false);
                oView.byId("moveReas").setVisible(false);
            }
        },

        onSaveHeader: function () {
            var oModel = this.getView().getModel("mainModel");
            var oHeader = oModel.getProperty("/header");
            if (!oHeader.reference_type) {
                MessageToast.show("Selecciona una operación de almacén");
                return;
            }
            if (!oHeader.doc_date || !oHeader.pstng_date || !oHeader.header_txt) {
                MessageToast.show("Completa todos los campos obligatorios");
                return;
            }
            if ((oHeader.reference_type === "reserva" || oHeader.reference_type === "orden") && !oHeader.ref_doc_no) {
                MessageToast.show("Ingresa el documento de referencia");
                return;
            }
            if (oHeader.reference_type === "otro" && !oHeader.move_type) {
                MessageToast.show("Ingresa la clase de movimiento");
                return;
            }
            MessageToast.show("Cabecera guardada correctamente");
            this._updatePositionFields();
            var oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Datos de Posición");
        },

        onCancelHeader: function () {
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/header", {
                pstng_date: new Date().toISOString().split("T")[0],
                doc_date: new Date().toISOString().split("T")[0],
                ref_doc_no: "",
                header_txt: "",
                move_type: "",
                reference_type: ""
            });
            MessageToast.show("Cancelado, formulario reiniciado");
        },

        onSaveItem: function () {
            var oModel = this.getView().getModel("mainModel");
            var oCurrentItem = oModel.getProperty("/currentItem");
            var oHeader = oModel.getProperty("/header");
            var sMoveType = oHeader.move_type;

            console.log("Datos antes de guardar:", oCurrentItem);
            // Validación de campos obligatorios básicos
            if (!oCurrentItem.material || !oCurrentItem.entry_qnt || !oCurrentItem.entry_uom ||
                !oCurrentItem.plant || !oCurrentItem.stge_loc) {
                MessageToast.show("Completa los campos obligatorios: Material, Cantidad, UM, Centro, Almacén");
                return;
            }
            // Validación de campos condicionales según move_type
            if (sMoveType === "201" || sMoveType === "551") {
                if (!oCurrentItem.costcenter) {
                    MessageToast.show("El Centro de Costo es obligatorio para esta clase de movimiento");
                    return;
                }
            }
            if (sMoveType === "261" || sMoveType === "601") {
                if (!oCurrentItem.orderid) {
                    MessageToast.show("La Orden es obligatoria para esta clase de movimiento");
                    return;
                }
            }
            if (sMoveType === "551") {
                if (!oCurrentItem.move_reas) {
                    MessageToast.show("El Motivo es obligatorio para esta clase de movimiento");
                    return;
                }
            }

            var oItems = oModel.getProperty("/items") || [];
            var oNewItem = Object.assign({}, oCurrentItem);
            console.log("Nuevo ítem a guardar:", oNewItem);
            oItems.push(oNewItem);
            oModel.setProperty("/items", oItems);
            // Actualizar contador
            var iItemCount = oItems.length;
            oModel.setProperty("/itemCount", iItemCount);
            // Forzar actualización del binding
            var oTable = this.getView().byId("itemsTable");
            if (oTable) {
                var oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.refresh(true);
                    oTable.rerender();
                    this.getView().rerender();
                }
                var oItemsInTable = oTable.getItems();
                if (oItemsInTable.length > 0) {
                    var oFirstItem = oItemsInTable[0];
                    var aCells = oFirstItem.getCells();
                    aCells.forEach((cell, index) => {
                        console.log(`Celda ${index}: ${cell.getText() || 'Sin texto'}`);
                    });
                }
                console.log("Ítems en el modelo:", oModel.getProperty("/items"));
                console.log("Binding info:", oBinding ? oBinding.getContexts() : "No binding");
                console.log("Ítems en la tabla:", oTable.getItems());
            } else {
                console.log("Tabla no encontrada con id 'itemsTable'");
            }
            // Reiniciar campos
            oModel.setProperty("/currentItem", {
                material: "", entry_qnt: "", entry_uom: "", batch: "",
                plant: "", stge_loc: "", costcenter: "", orderid: "",
                move_reas: "", position_txt: ""
            });
            MessageToast.show("Ítem guardado correctamente");
            this._updatePositionFields();
            var oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Orden Completa");
        },

        onCancelItem: function () {
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/currentItem", {
                material: "", entry_qnt: "", entry_uom: "", batch: "",
                plant: "", stge_loc: "", costcenter: "", orderid: "",
                move_reas: "", position_txt: ""
            });
            MessageToast.show("Cancelado, formulario reiniciado");
        },

        onMoveReasValueHelp: function (oEvent) {
            var oInput = oEvent.getSource();
            if (!this._oValueHelpDialog) {
                this._oValueHelpDialog = new sap.m.SelectDialog({
                    title: "Seleccionar Motivo",
                    items: {
                        path: "mainModel>/motivos",
                        template: new sap.m.StandardListItem({
                            title: "{mainModel>text}",
                            key: "{mainModel>key}"
                        })
                    },
                    confirm: function (oEvent) {
                        var oSelectedItem = oEvent.getParameter("selectedItem");
                        if (oSelectedItem) {
                            oInput.setValue(oSelectedItem.getTitle());
                            var oModel = this.getView().getModel("mainModel");
                            oModel.setProperty("/currentItem/move_reas", oSelectedItem.getKey());
                        }
                    }.bind(this)
                });
                this.getView().addDependent(this._oValueHelpDialog);
            }
            this._oValueHelpDialog.open();
        },

        onDeleteItem: function (oEvent) {
            var oItem = oEvent.getSource().getParent();
            var oBinding = oItem.getBindingContext("mainModel");
            var oModel = this.getView().getModel("mainModel");
            var aItems = oModel.getProperty("/items");
            if (oBinding && oBinding.getPath()) {
                var index = parseInt(oBinding.getPath().split("/").pop(), 10);
                aItems.splice(index, 1);
                oModel.setProperty("/items", aItems);
                // Actualizar contador tras eliminar
                var iItemCount = aItems.length;
                oModel.setProperty("/itemCount", iItemCount);
                var oTable = this.getView().byId("itemsTable");
                if (oTable) oTable.getBinding("items").refresh();
                MessageToast.show("Ítem eliminado");
            }
        },

        onSubmit: function () {
            var oModel = this.getView().getModel("mainModel");
            var oHeader = oModel.getProperty("/header");
            var oItems = oModel.getProperty("/items");
            if (!oItems.length) {
                MessageToast.show("Agrega al menos un ítem");
                return;
            }
            var oData = {
                GOODSMVT_HEADER: {
                    PSTNG_DATE: oHeader.pstng_date,
                    DOC_DATE: oHeader.doc_date,
                    REF_DOC_NO: oHeader.ref_doc_no,
                    HEADER_TXT: oHeader.header_txt
                },
                GOODSMVT_CODE: { gm_code: "03" },
                GOODSMVT_ITEM: oItems.map(item => ({
                    MATERIAL: item.material,
                    ENTRY_QNT: item.entry_qnt,
                    ENTRY_UOM: item.entry_uom,
                    BATCH: item.batch,
                    PLANT: item.plant,
                    STGE_LOC: item.stge_loc,
                    COSTCENTER: item.costcenter || "",
                    ORDERID: item.orderid || "",
                    MOVE_REAS: item.move_reas || ""
                }))
            };
            console.log("Datos enviados:", oData);
            MessageToast.show("Movimiento creado exitosamente (simulación)");
            oModel.setProperty("/items", []);
            oModel.setProperty("/itemCount", 0); // Reiniciar contador al enviar
            var oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Cabecera");
        },

        onExit: function () {
            MessageToast.show("Saliendo de la aplicación");
        }
    });
});