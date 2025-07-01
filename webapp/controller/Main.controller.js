sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/format/DateFormat"
], function (Controller, MessageToast, JSONModel, Filter, FilterOperator, DateFormat) {
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
                    reference_type: "",
                    ver_gr_gi_slip: "3",
                    ver_gr_gi_slipx: "X"
                },
                savedHeader: {},
                currentItem: {
                    material: "", entry_qnt: "", entry_uom: "", batch: "",
                    plant: "", stge_loc: "", costcenter: "", orderid: "",
                    move_reas: "", position_txt: "", reserv_no: "", res_item: ""
                },
                items: [],
                itemCount: 0,
                unitOfMeasureISO: {} // Almacenar mapeo MEINS -> MSEHI
            });
            this.getView().setModel(oModel, "mainModel");
            var oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Cabecera");
            this._loadMoveReasons();
            this._loadUnitOfMeasure();
        },

        _loadUnitOfMeasure: function () {
            // Simulación de tabla T006 para convertir MEINS a MSEHI
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/unitOfMeasureISO", {
                "ST": "PCE", // Stück -> Piece
                "KG": "KGM", // Kilogram
                "M": "MTR",  // Meter
                "L": "LTR"   // Liter
                // Agregar más según sea necesario
            });
            // Opcional: Integrar con OData para leer T006
            /*
            var oODataModel = this.getOwnerComponent().getModel();
            oODataModel.read("/T006", {
                success: function (oData) {
                    var oUOM = {};
                    oData.results.forEach(function (item) {
                        oUOM[item.MEINS] = item.MSEHI;
                    });
                    oModel.setProperty("/unitOfMeasureISO", oUOM);
                }.bind(this),
                error: function () {
                    MessageToast.show("Error al cargar unidades de medida");
                }
            });
            */
        },

        _loadMoveReasons: function () {
            // Simulación de tabla T157D para BWART = 551
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/motivos", [
                { key: "", text: "Selecciona..." },
                { key: "0001", text: "Motivo 1 - Scrap" },
                { key: "0002", text: "Motivo 2 - Obsolescencia" }
            ].filter(function (item) {
                return item.key === "" || item.key.startsWith("000");
            }));
            // Opcional: Integrar con OData para leer T157D
            /*
            var oODataModel = this.getOwnerComponent().getModel();
            oODataModel.read("/T157D", {
                filters: [new Filter("BWART", FilterOperator.EQ, "551")],
                success: function (oData) {
                    var aMotivos = [{ key: "", text: "Selecciona..." }];
                    oData.results.forEach(function (item) {
                        aMotivos.push({ key: item.GRUND, text: item.GRDTX });
                    });
                    oModel.setProperty("/motivos", aMotivos);
                }.bind(this),
                error: function () {
                    MessageToast.show("Error al cargar motivos");
                }
            });
            */
        },

        onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "Orden Completa" && !this.getView().getModel("mainModel").getProperty("/items").length) {
                MessageToast.show("Agrega al menos un ítem antes de ver la orden completa");
                oEvent.preventDefault();
                var oTabBar = this.getView().byId("mainTabBar");
                if (oTabBar) oTabBar.setSelectedKey("Datos de Posición");
            } else if (sKey === "Datos de Posición") {
                var oMaterialInput = this.getView().byId("material");
                setTimeout(function () {
                    oMaterialInput.focus();
                }, 100);
            }
        },

        onReferenceTypeChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/header/reference_type", sKey);
            oModel.setProperty("/header/move_type", "");
            this.getView().byId("moveTypeManual").setValue("");
            this.getView().byId("refDocNo").setValue("");
            if (sKey === "reserva") {
                oModel.setProperty("/header/move_type", "201");
            } else if (sKey === "orden") {
                oModel.setProperty("/header/move_type", "261");
            } else if (sKey === "otro") {
                oModel.setProperty("/header/move_type", "");
            }
            oModel.setProperty("/currentItem", {
                material: "", entry_qnt: "", entry_uom: "", batch: "",
                plant: "", stge_loc: "", costcenter: "", orderid: "",
                move_reas: "", position_txt: "", reserv_no: "", res_item: ""
            });
            this._updatePositionFields();
        },

        _updatePositionFields: function () {
            var oModel = this.getView().getModel("mainModel");
            var sMoveType = oModel.getProperty("/savedHeader/move_type");
            var oView = this.getView();
            oModel.setProperty("/currentItem", {
                material: "", entry_qnt: "", entry_uom: "", batch: "",
                plant: "", stge_loc: "", costcenter: "", orderid: "",
                move_reas: "", position_txt: "", reserv_no: "", res_item: ""
            });
            oView.byId("costcenter").setVisible(sMoveType === "201" || sMoveType === "551");
            oView.byId("orderid").setVisible(sMoveType === "261");
            oView.byId("moveReas").setVisible(sMoveType === "551");
            oView.byId("reservNo").setVisible(sMoveType === "201");
            oView.byId("resItem").setVisible(sMoveType === "201");
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
            oModel.setProperty("/savedHeader", Object.assign({}, oHeader));
            MessageToast.show("Cabecera guardada correctamente");
            this._updatePositionFields();
            oModel.setProperty("/header", {
                pstng_date: new Date().toISOString().split("T")[0],
                doc_date: new Date().toISOString().split("T")[0],
                ref_doc_no: "",
                header_txt: "",
                move_type: "",
                reference_type: "",
                ver_gr_gi_slip: "3",
                ver_gr_gi_slipx: "X"
            });
            var oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Datos de Posición");
        },

        formatDate: function (sDate) {
            if (!sDate) return "";
            var oDate = new Date(sDate);
            var oDateFormat = DateFormat.getDateInstance({ pattern: "yyyy-MMMM-dd" });
            return oDateFormat.format(oDate);
        },

        onSaveItem: function () {
            var oModel = this.getView().getModel("mainModel");
            var oCurrentItem = oModel.getProperty("/currentItem");
            var oHeader = oModel.getProperty("/savedHeader");
            var sMoveType = oHeader.move_type;

            // Validar campos obligatorios
            if (!oCurrentItem.material || !oCurrentItem.entry_qnt || !oCurrentItem.entry_uom ||
                !oCurrentItem.plant || !oCurrentItem.stge_loc) {
                MessageToast.show("Completa los campos obligatorios: Material, Cantidad, UM, Centro, Almacén");
                return;
            }

            // Validar Centro de Costo
            if ((sMoveType === "201" || sMoveType === "551") && (!oCurrentItem.costcenter || oCurrentItem.costcenter.trim() === "")) {
                MessageToast.show("El campo Centro de Costo es obligatorio para este tipo de movimiento");
                return;
            }

            // Validar Orden de Compra
            if (sMoveType === "261" && (!oCurrentItem.orderid || oCurrentItem.orderid.trim() === "")) {
                MessageToast.show("El campo Orden de Compra es obligatorio");
                return;
            }

            // Validar Motivo
            if (sMoveType === "551" && (!oCurrentItem.move_reas || oCurrentItem.move_reas.trim() === "")) {
                MessageToast.show("El campo Motivo es obligatorio");
                return;
 BAPI_GOODSMVT_CREATE
            }

            // Validar Unidad de Medida
            var oUOM = oModel.getProperty("/unitOfMeasureISO");
            if (!oUOM[oCurrentItem.entry_uom]) {
                MessageToast.show("Unidad de medida no válida");
                return;
            }

            // Guardar el ítem
            var oItems = oModel.getProperty("/items") || [];
            var oNewItem = Object.assign({}, oCurrentItem);
            oNewItem.orderpr_un_iso = oUOM[oCurrentItem.entry_uom]; // Mapear ORDERPR_UN_ISO
            oItems.push(oNewItem);
            oModel.setProperty("/items", oItems);
            oModel.setProperty("/itemCount", oItems.length);
            var oTable = this.getView().byId("itemsTable");
            if (oTable) oTable.getBinding("items").refresh();
            oModel.setProperty("/currentItem", {
                material: "", entry_qnt: "", entry_uom: "", batch: "",
                plant: "", stge_loc: "", costcenter: "", orderid: "",
                move_reas: "", position_txt: "", reserv_no: "", res_item: ""
            });
            MessageToast.show("Ítem guardado");
            var oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Orden Completa");
        },

        onCancelItem: function () {
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/currentItem", {
                material: "", entry_qnt: "", entry_uom: "", batch: "",
                plant: "", stge_loc: "", costcenter: "", orderid: "",
                move_reas: "", position_txt: "", reserv_no: "", res_item: ""
            });
            MessageToast.show("Entrada cancelada");
            var oMaterialInput = this.getView().byId("material");
            setTimeout(function () {
                oMaterialInput.focus();
            }, 100);
        },

        onCancelHeader: function () {
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/header", {
                pstng_date: new Date().toISOString().split("T")[0],
                doc_date: new Date().toISOString().split("T")[0],
                ref_doc_no: "",
                header_txt: "",
                move_type: "",
                reference_type: "",
                ver_gr_gi_slip: "3",
                ver_gr_gi_slipx: "X"
            });
            MessageToast.show("Entrada de cabecera cancelada");
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
                            description: "{mainModel>key}",
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
                    }.bind(this),
                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        var oFilter = new Filter("text", FilterOperator.Contains, sValue);
                        oEvent.getSource().getBinding("items").filter([oFilter]);
                    }
                });
                this.getView().addDependent(this._oValueHelpDialog);
            }
            this._oValueHelpDialog.open();
        },

        onSubmit: function () {
            var oModel = this.getView().getModel("mainModel");
            var oHeader = oModel.getProperty("/savedHeader");
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
                    HEADER_TXT: oHeader.header_txt,
                    VER_GR_GI_SLIP: oHeader.ver_gr_gi_slip,
                    VER_GR_GI_SLIPX: oHeader.ver_gr_gi_slipx
                },
                GOODSMVT_CODE: { GM_CODE: "03" },
                GOODSMVT_ITEM: oItems.map(item => ({
                    MATERIAL: item.material,
                    PLANT: item.plant,
                    STGE_LOC: item.stge_loc,
                    BATCH: item.batch,
                    MOVE_TYPE: oHeader.move_type,
                    ENTRY_QNT: item.entry_qnt,
                    ENTRY_UOM: item.entry_uom,
                    ORDERPR_UN_ISO: item.orderpr_un_iso,
                    COSTCENTER: item.costcenter || "",
                    ORDERID: item.orderid || "",
                    MOVE_REAS: item.move_reas || "",
                    RESERV_NO: item.reserv_no || "",
                    RES_ITEM: item.res_item || ""
                }))
            };
            console.log("Datos enviados al backend (BAPI_GOODSMVT_CREATE):", oData);
            MessageToast.show("Orden enviada al backend con éxito (simulación)");
            oModel.setProperty("/items", []);
            oModel.setProperty("/itemCount", 0);
            oModel.setProperty("/savedHeader", {});
            var oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Cabecera");
        },

        onDeleteItem: function (oEvent) {
            var oItem = oEvent.getSource().getParent();
            var oBinding = oItem.getBindingContext("mainModel");
            var oModel = this.getView().getModel("mainModel");
            var aItems = oModel.getProperty("/items");
            if (oBinding && oBinding.getPath()) {
                var sPath = oBinding.getPath();
                var index = parseInt(sPath.split("/").pop(), 10);
                if (index >= 0 && index < aItems.length) {
                    aItems.splice(index, 1);
                    oModel.setProperty("/items", aItems);
                    oModel.setProperty("/itemCount", aItems.length);
                    var oTable = this.getView().byId("itemsTable");
                    if (oTable) {
                        oTable.getBinding("items").refresh();
                        MessageToast.show("Ítem eliminado");
                    } else {
                        MessageToast.show("Error: Tabla no encontrada");
                    }
                } else {
                    MessageToast.show("Error: Índice inválido");
                }
            } else {
                MessageToast.show("Error: No se pudo determinar el ítem a eliminar");
            }
        },

        onScanMaterial: function () {
            sap.m.MessageToast.show("Por favor, escanea el material");
            var oMaterialInput = this.getView().byId("material");
            setTimeout(function () {
                oMaterialInput.focus();
            }, 100);
        },

        onMaterialScanned: function (oEvent) {
            var sScannedValue = oEvent.getParameter("value");
            var oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/currentItem/material", sScannedValue ? sScannedValue.trim() : "");
            this._validateMaterial(sScannedValue);
            setTimeout(function () {
                this.getView().byId("material").focus();
            }.bind(this), 100);
        },

        _validateMaterial: function (sMaterial) {
            if (sMaterial && sScannedValue.trim()) {
                sap.m.MessageToast.show("Material escaneado: " + sMaterial);
            } else {
                sap.m.MessageToast.show("Código de material inválido");
            }
        },

        onExit: function () {
            sap.m.MessageToast.show("Saliendo de la aplicación");
        }
    });
});