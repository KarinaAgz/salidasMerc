sap.ui.define([
    "logaligroup/mapeobapi/controller/BaseController",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/library",
    "jquery.sap.global"
], function (BaseController, ODataModel, JSONModel, Filter, FilterOperator, Fragment, MessageBox, MessageToast, CoreLibrary, jQuery) {
    "use strict";

    return BaseController.extend("logaligroup.mapeobapi.controller.Main", {
        onInit: async function () {
            // Configurar modelos OData
            const oODataModels = {
                ZSB_HANDHELD_V2: new ODataModel("/sap/opu/odata/sap/ZSB_HANDHELD_V2/", {
                    json: true,
                    useBatch: true,
                    defaultBindingMode: "TwoWay"
                }),
                API_PRODUCTION_ORDER_2_SRV: new ODataModel("/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/", {
                    json: true,
                    useBatch: true,
                    defaultBindingMode: "TwoWay"
                }),
                productApi: new ODataModel("/sap/opu/odata/sap/productApi/", {
                    json: true,
                    useBatch: true,
                    defaultBindingMode: "TwoWay"
                }),
                apiBatch: new ODataModel("/sap/opu/odata/sap/apiBatch/", {
                    json: true,
                    useBatch: true,
                    defaultBindingMode: "TwoWay"
                }),
                API_MATERIAL_DOCUMENT_SRV: new ODataModel("/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/", {
                    json: true,
                    useBatch: true,
                    defaultBindingMode: "TwoWay"
                })
            };
            this.getView().setModel(oODataModels.ZSB_HANDHELD_V2, "ZSB_HANDHELD_V2");
            this.getView().setModel(oODataModels.API_PRODUCTION_ORDER_2_SRV, "API_PRODUCTION_ORDER_2_SRV");
            this.getView().setModel(oODataModels.productApi, "productApi");
            this.getView().setModel(oODataModels.apiBatch, "apiBatch");
            this.getView().setModel(oODataModels.API_MATERIAL_DOCUMENT_SRV, "API_MATERIAL_DOCUMENT_SRV");

            // Inicializar mainModel
            const oModel = new JSONModel({
                header: {
                    pstng_date: new Date().toISOString().split("T")[0],
                    doc_date: new Date().toISOString().split("T")[0],
                    ref_doc_no: "",
                    header_txt: "",
                    move_type: "",
                    reference_type: "",
                    textClaseMov: ""
                },
                savedHeader: {},
                currentItem: {
                    material: "",
                    txt_material: "",
                    cantidad: "",
                    um: "",
                    batch: "",
                    centro: "",
                    almacen: "",
                    costcenter: "",
                    motivo: "",
                    txt_posicion: "",
                    txt_posicion_historico: "",
                    MaterialDocument: "",
                    isBatchRequired: false,
                    materialState: "None",
                    materialStateText: "",
                    quantityState: "None",
                    quantityStateText: ""
                },
                ReferenceItems: [],
                Positions: [],
                itemCount: 0,
                config: {
                    displayConfig: {}
                }
            });
            this.getView().setModel(oModel, "mainModel");

            // Crear modelo para clases de movimiento
            const oClaseMovModel = new JSONModel([]);
            this.getView().setModel(oClaseMovModel, "claseMovModel");

            // Cargar configuración de visualización
            const oDisplayModel = new JSONModel();
            this.getView().setModel(oDisplayModel, "oDisplayModel");

            // Seleccionar pestaña Cabecera por defecto
            const oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Cabecera");

            // Cargar datos OData y configuración
            await this._loadODataData();
            await this._loadDisplayConfiguration();
        },

        _loadODataData: async function () {
            const oClaseMovModel = this.getView().getModel("claseMovModel");
            const oODataModel = this.getView().getModel("ZSB_HANDHELD_V2");

            try {
                const aClaseMovimientos = await new Promise((resolve, reject) => {
                    oODataModel.read("/ClaseMov", {
                        success: function (oData) {
                            const aResults = [{ ClaseMovimiento: "", Descripcion: "Selecciona..." }].concat(
                                oData.results.map(item => ({
                                    ClaseMovimiento: item.ClaseMovimiento,
                                    Descripcion: item.Descripcion
                                }))
                            );
                            resolve(aResults);
                        },
                        error: reject
                    });
                });
                oClaseMovModel.setData(aClaseMovimientos);
                console.log("Clases de movimiento cargadas correctamente");
            } catch (error) {
                console.error("Error al cargar datos OData:", error);
                oClaseMovModel.setData([]);
                MessageBox.error("Error al cargar clases de movimiento. El selector puede no funcionar.");
            }
        },

        _loadDisplayConfiguration: async function () {
            const oModel = this.getView().getModel("mainModel");
            const oDisplayModel = this.getView().getModel("oDisplayModel");

            try {
                const response = await jQuery.ajax({
                    url: "/utils/DisplayConfiguration.json",
                    method: "GET",
                    dataType: "json"
                });
                oDisplayModel.setData(response);
                oModel.setProperty("/config/displayConfig", response);
                console.log("Configuración de visualización cargada:", response);
                this._applyDisplayConfiguration();
            } catch (error) {
                console.error("Error al cargar DisplayConfiguration.json:", error);
                oDisplayModel.setData({});
                oModel.setProperty("/config/displayConfig", {});
                MessageBox.error("Error al cargar configuración de visualización.");
            }
        },

        _applyDisplayConfiguration: function () {
            const oModel = this.getView().getModel("mainModel");
            const oDisplayModel = this.getView().getModel("oDisplayModel").getData();
            const oView = this.getView();

            const aHeaderControls = [
                { id: "referenceType", key: "operacion_almacen" },
                { id: "moveTypeManual", key: "claseMov" },
                { id: "docDate", key: "fecha_doc" },
                { id: "pstngDate", key: "fecha_cont" },
                { id: "refDocNo", key: "referencia" },
                { id: "headerTxt", key: "texto_cabecera" }
            ];

            aHeaderControls.forEach(({ id, key }) => {
                const oControl = oView.byId(id);
                if (oControl && oDisplayModel.Header?.[key] !== undefined) {
                    oControl.setVisible(oDisplayModel.Header[key]);
                    const oParent = oControl.getParent();
                    const oLabel = oParent.getLabel && oParent.getLabel();
                    if (oLabel) oLabel.setVisible(oDisplayModel.Header[key]);
                }
            });

            const aPosicionControls = [
                { id: "material", key: "material" },
                { id: "materialDesc", key: "descripcion_material" },
                { id: "cantidad", key: "cantidad" },
                { id: "um", key: "um" },
                { id: "batch", key: "lote" },
                { id: "centro", key: "centro" },
                { id: "almacen", key: "almacen" },
                { id: "costcenter", key: "ceco" },
                { id: "motivo", key: "motivo" },
                { id: "txtPosicion", key: "txt_posicion" },
                { id: "materialDocument", key: "num_docto" }
            ];

            aPosicionControls.forEach(({ id, key }) => {
                const oControl = oView.byId(id);
                if (oControl && oDisplayModel.Posiciones?.[key] !== undefined) {
                    oControl.setVisible(oDisplayModel.Posiciones[key]);
                    const oParent = oControl.getParent();
                    const oLabel = oParent.getLabel && oParent.getLabel();
                    if (oLabel) oLabel.setVisible(oDisplayModel.Posiciones[key]);
                }
            });

            this._updateBatchField();
        },

        _updateBatchField: function () {
            const oModel = this.getView().getModel("mainModel");
            const bIsBatchRequired = oModel.getProperty("/currentItem/isBatchRequired");
            const oBatchInput = this.getView().byId("batch");
            if (oBatchInput) {
                oBatchInput.setEnabled(bIsBatchRequired);
                if (!bIsBatchRequired) {
                    oModel.setProperty("/currentItem/batch", "");
                }
            }
        },

        onReferenceTypeChange: function (oEvent) {
            const oModel = this.getView().getModel("mainModel");
            const sClaseMovimiento = oEvent.getParameter("selectedItem")?.getKey() || "";
            const sDescription = oEvent.getParameter("selectedItem")?.getText() || "";

            oModel.setProperty("/header/move_type", sClaseMovimiento);
            oModel.setProperty("/header/textClaseMov", sDescription);
            oModel.setProperty("/savedHeader", {
                ...oModel.getProperty("/header"),
                movementDescription: sClaseMovimiento ? `${sClaseMovimiento} - ${sDescription}` : ""
            });

            const oDisplayModel = this.getView().getModel("oDisplayModel");
            const c_601 = "601", c_602 = "602", c_261 = "261", c_262 = "262";
            const c_551 = "551", c_552 = "552", c_201 = "201", c_202 = "202", c_999 = "999";

            if ([c_601, c_602, c_261, c_262].includes(sClaseMovimiento)) {
                oDisplayModel.setProperty("/Posiciones/ceco", false);
                oDisplayModel.setProperty("/Posiciones/motivo", false);
                oDisplayModel.setProperty("/Header/referencia", true);
            } else if ([c_551, c_552, c_201, c_202, c_999].includes(sClaseMovimiento)) {
                oDisplayModel.setProperty("/Header/referencia", false);
                oDisplayModel.setProperty("/Posiciones/ceco", true);
                oDisplayModel.setProperty("/Posiciones/motivo", true);
            } else if (sClaseMovimiento === c_999) {
                oDisplayModel.setProperty("/Posiciones/ceco", true);
                oDisplayModel.setProperty("/Posiciones/motivo", true);
                oDisplayModel.setProperty("/Header/referencia", true);
            }

            this.getView().byId("moveTypeManual").setValue(sClaseMovimiento);
            this.getView().byId("refDocNo").setValue("");
            this._resetCurrentItem();
            this._applyDisplayConfiguration();
        },

        validateHeaderFields: function () {
            const oModel = this.getView().getModel("mainModel");
            const oDisplayModel = this.getView().getModel("oDisplayModel").getData();
            const oBundle = this.getResourceBundle();
            const oHeader = oModel.getProperty("/header");
            let bValid = true;
            const aMissingFields = [];

            const aFields = [
                { id: "referenceType", prop: "move_type", label: oBundle.getText("salidaMercancia") },
                { id: "docDate", prop: "doc_date", label: oBundle.getText("fechaDocumento") },
                { id: "pstngDate", prop: "pstng_date", label: oBundle.getText("fechaContabilizacion") },
                { id: "refDocNo", prop: "ref_doc_no", label: oBundle.getText("referencia") },
                { id: "headerTxt", prop: "header_txt", label: oBundle.getText("textoCabecera") }
            ];

            aFields.forEach(oField => {
                const oControl = this.getView().byId(oField.id);
                const sValue = oModel.getProperty(`/header/${oField.prop}`);
                let bIsEmpty = !sValue || sValue.trim() === "" || (oField.id === "referenceType" && sValue === "0");

                if (oField.id === "refDocNo" && !oDisplayModel.Header.referencia) {
                    bIsEmpty = false;
                }

                if (bIsEmpty) {
                    bValid = false;
                    aMissingFields.push(oField.label);
                    oControl.setValueState("Error");
                    oControl.setValueStateText(oBundle.getText("validation.fieldRequired", [oField.label]));
                } else {
                    oControl.setValueState("None");
                }
            });

            if (!bValid) {
                MessageBox.error(oBundle.getText("validation.missingFields", [aMissingFields.join(", ")]));
                this.getView().setBusy(false);
            }

            return bValid;
        },

        onContinueHeader: async function () {
            this.getView().setBusy(true);

            if (!this.validateHeaderFields()) {
                this.getView().setBusy(false);
                return;
            }

            const oModel = this.getView().getModel("mainModel");
            const oDisplayModel = this.getView().getModel("oDisplayModel").getData();
            const sReference = oModel.getProperty("/header/ref_doc_no");

            if (oDisplayModel.Header.referencia && !sReference) {
                this.showMessage("Ingresa un documento de referencia");
                this.onNavToIconTabBar("Cabecera");
                this.getView().setBusy(false);
                return;
            }

            try {
                const oODataModel = this.getView().getModel("API_PRODUCTION_ORDER_2_SRV");
                const iPageSize = 5000;
                const oBundle = this.getResourceBundle();
                const oRefItems = await new Promise((resolve, reject) => {
                    oODataModel.read("/A_ProductionOrderComponent_4", {
                        filters: [new Filter("ManufacturingOrder", FilterOperator.EQ, sReference)],
                        urlParameters: { "$top": iPageSize },
                        success: function (oData) { resolve(oData.results); },
                        error: reject
                    });
                });

                const oItems = await Promise.all(oRefItems.map(async element => {
                    const oCantDisponible = parseFloat(element.RequiredQuantity) - parseFloat(element.WithdrawnQuantity);
                    const isBatchRequired = await this.searchBatchRequired(element);
                    const sMaterialText = await this.onSearchMaterialText(element);
                    return {
                        material: element.Material,
                        txt_material: sMaterialText,
                        cantidad: oCantDisponible.toFixed(3),
                        um: element.BaseUnitSAPCode,
                        centro: element.Plant,
                        almacen: element.StorageLocation,
                        MaterialDocument: "",
                        isBatchRequired_txt: isBatchRequired ? oBundle.getText("yes") : oBundle.getText("no"),
                        GoodsMovementType: element.GoodsMovementType,
                        isBatchRequired: isBatchRequired
                    };
                }));

                oModel.setProperty("/ReferenceItems", oItems);
                oModel.setProperty("/savedHeader", {
                    ...oModel.getProperty("/header"),
                    movementDescription: oModel.getProperty("/header/move_type") ? 
                        `${oModel.getProperty("/header/move_type")} - ${oModel.getProperty("/header/textClaseMov")}` : ""
                });

                if (!this.oItemsDialog) {
                    this.oItemsDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "logaligroup.mapeobapi.fragments.ItemsDialog",
                        controller: this
                    });
                    this.getView().addDependent(this.oItemsDialog);
                }
                this.oItemsDialog.open();
                this.showMessage(`Se encontraron ${oItems.length} ítems para la referencia ${sReference}`);
            } catch (error) {
                MessageBox.error("Error al cargar ítems: " + (error.message || "Desconocido"));
            } finally {
                this.getView().setBusy(false);
            }
        },

        searchBatchRequired: async function (element) {
            const oModel = this.getView().getModel("productApi");
            try {
                const oData = await new Promise((resolve, reject) => {
                    oModel.read("/Product", {
                        filters: [
                            new Filter("ManufacturingOrder", FilterOperator.EQ, element.ManufacturingOrder),
                            new Filter("Material", FilterOperator.EQ, element.Material)
                        ],
                        success: function (oData) { resolve(oData); },
                        error: reject
                    });
                });
                return oData.results[0]?.IsBatchManagementRequired || false;
            } catch (error) {
                console.error("Error en searchBatchRequired:", error);
                return false;
            }
        },

        onSearchMaterialText: async function (element) {
            const oModel = this.getView().getModel("productApi");
            try {
                const oData = await new Promise((resolve, reject) => {
                    oModel.read("/ProductDescription", {
                        filters: [
                            new Filter("ManufacturingOrder", FilterOperator.EQ, element.ManufacturingOrder),
                            new Filter("Material", FilterOperator.EQ, element.Material)
                        ],
                        success: function (oData) { resolve(oData); },
                        error: reject
                    });
                });
                return oData.results[0]?.ProductDescription || "";
            } catch (error) {
                console.error("Error en onSearchMaterialText:", error);
                return "";
            }
        },

        onSearchBatchList: async function (element) {
            const oModel = this.getView().getModel("apiBatch");
            try {
                const oData = await new Promise((resolve, reject) => {
                    oModel.read("/Batch", {
                        filters: [new Filter("Material", FilterOperator.EQ, element.material)],
                        success: function (oData) { resolve(oData.results); },
                        error: reject
                    });
                });
                const oBatchModel = new JSONModel(oData);
                this.getView().setModel(oBatchModel, "BatchList");
                return oData;
            } catch (error) {
                console.error("Error en onSearchBatchList:", error);
                return [];
            }
        },

        onProcesarItem: async function (oEvent) {
            const oItem = oEvent.getSource().getBindingContext("mainModel")?.getObject();
            if (!oItem) {
                MessageBox.error("Error: No se pudo obtener el ítem seleccionado");
                return;
            }
            const oModel = this.getView().getModel("mainModel");

            await this.onSearchBatchList(oItem);

            oModel.setProperty("/currentItem", {
                material: oItem.material,
                txt_material: oItem.txt_material,
                cantidad: oItem.cantidad,
                um: oItem.um,
                batch: oItem.isBatchRequired ? "" : "",
                centro: oItem.centro,
                almacen: oItem.almacen,
                costcenter: "",
                motivo: "",
                txt_posicion: "",
                txt_posicion_historico: "",
                MaterialDocument: "",
                isBatchRequired: oItem.isBatchRequired,
                materialState: "Success",
                materialStateText: "",
                quantityState: "Success",
                quantityStateText: ""
            });

            this.onCloseItemsDialog();
            this.onNavToIconTabBar("Posicion");
            this._updateBatchField();
        },

        onCloseItemsDialog: function () {
            if (this.oItemsDialog) {
                this.oItemsDialog.close();
            }
        },

        onNavToIconTabBar: function (sKey) {
            const oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) {
                oTabBar.setSelectedKey(sKey);
            }
        },

        onTabSelect: function (oEvent) {
            const sKey = oEvent.getParameter("key");
            if (sKey === "Posicion" && !this.getView().getModel("mainModel").getProperty("/savedHeader/move_type")) {
                this.showMessage("Primero completa la cabecera");
                this.onNavToIconTabBar("Cabecera");
            }
        },

        _validateItem: function (oItem, sMoveType) {
            const oBundle = this.getResourceBundle();
            if (!oItem.material || !oItem.cantidad || !oItem.um || !oItem.centro || !oItem.almacen) {
                this.showMessage(oBundle.getText("position.missingFields"));
                return false;
            }
            if ((sMoveType === "201" || sMoveType === "551") && !oItem.costcenter?.trim()) {
                this.showMessage("El campo Centro de Costo es obligatorio para este tipo de movimiento");
                return false;
            }
            if (sMoveType === "551" && !oItem.motivo?.trim()) {
                this.showMessage("El campo Motivo es obligatorio");
                return false;
            }
            if (oItem.isBatchRequired && !oItem.batch?.trim()) {
                this.showMessage("El campo Lote es obligatorio para este material");
                return false;
            }
            return true;
        },

        _resetCurrentItem: function () {
            const oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/currentItem", {
                material: "",
                txt_material: "",
                cantidad: "",
                um: "",
                batch: "",
                centro: "",
                almacen: "",
                costcenter: "",
                motivo: "",
                txt_posicion: "",
                txt_posicion_historico: "",
                MaterialDocument: "",
                isBatchRequired: false,
                materialState: "None",
                materialStateText: "",
                quantityState: "None",
                quantityStateText: ""
            });
        },

        onSaveItem: async function () {
            const oModel = this.getView().getModel("mainModel");
            const oCurrentItem = oModel.getProperty("/currentItem");
            const oHeader = oModel.getProperty("/savedHeader");

            if (!this._validateItem(oCurrentItem, oHeader.move_type)) return;

            const aPositions = oModel.getProperty("/Positions") || [];
            aPositions.push({
                material: oCurrentItem.material,
                txt_material: oCurrentItem.txt_material,
                cantidad: oCurrentItem.cantidad,
                um: oCurrentItem.um,
                batch: oCurrentItem.batch,
                centro: oCurrentItem.centro,
                almacen: oCurrentItem.almacen,
                costcenter: oCurrentItem.costcenter,
                motivo: oCurrentItem.motivo,
                txt_posicion: oCurrentItem.txt_posicion,
                MaterialDocument: oCurrentItem.MaterialDocument || "",
                isBatchRequired: oCurrentItem.isBatchRequired
            });
            oModel.setProperty("/Positions", aPositions);
            oModel.setProperty("/itemCount", aPositions.length);

            const oTable = this.getView().byId("itemsTable");
            if (oTable) {
                oTable.getBinding("items").refresh();
            }

            this._resetCurrentItem();
            this.showMessage("Ítem guardado");
            this.onNavToIconTabBar("OrdenCompleta");
        },

        onCancelItem: function () {
            this._resetCurrentItem();
            this.showMessage("Entrada cancelada");
            const oMaterialInput = this.getView().byId("material");
            if (oMaterialInput) {
                setTimeout(() => oMaterialInput.focus(), 100);
            }
        },

        onCancelHeader: function () {
            const oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/header", {
                pstng_date: new Date().toISOString().split("T")[0],
                doc_date: new Date().toISOString().split("T")[0],
                ref_doc_no: "",
                header_txt: "",
                move_type: "",
                reference_type: "",
                textClaseMov: ""
            });
            oModel.setProperty("/savedHeader", {});
            this.showMessage("Entrada de cabecera cancelada");
        },

        onResetProcess: function () {
            const oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/savedHeader", {});
            oModel.setProperty("/Positions", []);
            oModel.setProperty("/itemCount", 0);
            oModel.setProperty("/ReferenceItems", []);
            oModel.setProperty("/header", {
                pstng_date: new Date().toISOString().split("T")[0],
                doc_date: new Date().toISOString().split("T")[0],
                ref_doc_no: "",
                header_txt: "",
                move_type: "",
                reference_type: "",
                textClaseMov: ""
            });
            this.onNavToIconTabBar("Cabecera");
            this.showMessage("Proceso reiniciado");
        },

        onAddComponent: function () {
            this._resetCurrentItem();
            this.onNavToIconTabBar("Posicion");
        },

        onDeleteItem: function (oEvent) {
            const oModel = this.getView().getModel("mainModel");
            const oItem = oEvent.getSource().getBindingContext("mainModel").getObject();
            const aPositions = oModel.getProperty("/Positions");
            const iIndex = aPositions.indexOf(oItem);

            if (iIndex !== -1) {
                MessageBox.confirm(this.getResourceBundle().getText("confirmDeleteItem"), {
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            aPositions.splice(iIndex, 1);
                            oModel.setProperty("/Positions", aPositions);
                            oModel.setProperty("/itemCount", aPositions.length);
                            this.showMessage("Ítem eliminado");
                            const oTable = this.getView().byId("itemsTable");
                            if (oTable) {
                                oTable.getBinding("items").refresh();
                            }
                        }
                    }.bind(this)
                });
            }
        },

        onItemSelected: function (oEvent) {
            const oItem = oEvent.getParameter("listItem").getBindingContext("mainModel").getObject();
            const oModel = this.getView().getModel("mainModel");

            oModel.setProperty("/currentItem", {
                material: oItem.material,
                txt_material: oItem.txt_material,
                cantidad: oItem.cantidad,
                um: oItem.um,
                batch: oItem.batch,
                centro: oItem.centro,
                almacen: oItem.almacen,
                costcenter: oItem.costcenter,
                motivo: oItem.motivo,
                txt_posicion: oItem.txt_posicion,
                txt_posicion_historico: oItem.txt_posicion_historico || "",
                MaterialDocument: oItem.MaterialDocument || "",
                isBatchRequired: oItem.isBatchRequired,
                materialState: "Success",
                materialStateText: "",
                quantityState: "Success",
                quantityStateText: ""
            });

            this.onNavToIconTabBar("Posicion");
            this._updateBatchField();
        },

        onCreateMov: async function () {
            this.getView().setBusy(true);

            try {
                const oModel = this.getView().getModel("mainModel");
                const oODataModel = this.getView().getModel("API_MATERIAL_DOCUMENT_SRV");
                const oBundle = this.getResourceBundle();
                const oHeader = oModel.getProperty("/savedHeader");
                const aPositions = oModel.getProperty("/Positions") || [];

                if (!aPositions.length) {
                    MessageBox.error(oBundle.getText("error.noItems"));
                    this.getView().setBusy(false);
                    return;
                }

                const oDate = oHeader.pstng_date + "T00:00:00";
                const oGoodMovement = oHeader.move_type;

                if (!oGoodMovement) {
                    MessageBox.error(oBundle.getText("error.missingMovement"));
                    this.getView().setBusy(false);
                    return;
                }

                const oRequestJson = {
                    PostingDate: oDate,
                    GoodsMovementCode: oGoodMovement,
                    MaterialDocumentHeaderText: oHeader.header_txt,
                    ReferenceDocument: oHeader.ref_doc_no,
                    to_MaterialDocumentItem: aPositions.map(item => ({
                        Material: item.material,
                        Plant: item.centro,
                        Batch: item.batch || "",
                        StorageLocation: item.almacen,
                        GoodsMovementType: item.GoodsMovementType || oGoodMovement,
                        MaterialDocumentItemText: item.txt_posicion || "Rollo",
                        ManufacturingOrder: oHeader.ref_doc_no,
                        IsCompletelyDelivered: false,
                        QuantityInEntryUnit: item.cantidad,
                        CostCenter: item.costcenter || ""
                    }))
                };

                const sToken = await this.fetchCsrfToken("API_MATERIAL_DOCUMENT_SRV", "A_MaterialDocumentHeader");
                const oResponse = await new Promise((resolve, reject) => {
                    oODataModel.create("/A_MaterialDocumentHeader", oRequestJson, {
                        headers: { "X-CSRF-Token": sToken },
                        success: function (oData, oResponse) {
                            resolve({ data: oData, response: oResponse });
                        },
                        error: reject
                    });
                });

                // Obtener el MaterialDocument de la respuesta
                const sMaterialDocument = oResponse.data.MaterialDocument || oResponse.response.headers["sap-message"]?.match(/"MaterialDocument":"([^"]+)"/)?.[1] || "";

                // Actualizar Positions con el MaterialDocument
                const aUpdatedPositions = aPositions.map(item => ({
                    ...item,
                    MaterialDocument: sMaterialDocument
                }));
                oModel.setProperty("/Positions", aUpdatedPositions);

                MessageToast.show(oBundle.getText("success.movCreated") + ` (Documento: ${sMaterialDocument})`);
                console.log("Respuesta del POST:", oResponse);
                this._resetCurrentItem();
                oModel.setProperty("/itemCount", aUpdatedPositions.length);
                const oTable = this.getView().byId("itemsTable");
                if (oTable) {
                    oTable.getBinding("items").refresh();
                }
                // No reiniciar todo para mantener la tabla visible
                // oModel.setProperty("/savedHeader", {});
                // oModel.setProperty("/ReferenceItems", []);
                // this.onNavToIconTabBar("Cabecera");
            } catch (error) {
                console.error("Error en onCreateMov:", error);
                MessageBox.error(oBundle.getText("error.unexpected"));
            } finally {
                this.getView().setBusy(false);
            }
        },

        fetchCsrfToken: async function (sModelName, sEntitySet) {
            const oModel = this.getView().getModel(sModelName);
            return new Promise((resolve, reject) => {
                oModel.refreshSecurityToken(
                    () => resolve(oModel.getSecurityToken()),
                    reject
                );
            });
        },

        onMoveReasValueHelp: function (oEvent) {
            if (!this._oValueHelpDialog) {
                Fragment.load({
                    name: "logaligroup.mapeobapi.fragments.MoveReasValueHelp",
                    controller: this
                }).then(oDialog => {
                    this._oValueHelpDialog = oDialog;
                    this.getView().addDependent(this._oValueHelpDialog);
                    this._bindValueHelpDialog();
                    this._oValueHelpDialog.open();
                }).catch(error => {
                    MessageBox.error("Error al cargar el diálogo de ayuda de motivos: " + error.message);
                });
            } else {
                this._bindValueHelpDialog();
                this._oValueHelpDialog.open();
            }
        },

        _bindValueHelpDialog: function () {
            if (this._oValueHelpDialog) {
                this._oValueHelpDialog.bindAggregation("items", {
                    path: "mainModel>/config/moveReasons",
                    template: new sap.m.StandardListItem({
                        title: "{mainModel>text}",
                        description: "{mainModel>key}",
                        key: "{mainModel>key}"
                    })
                });
                this._oValueHelpDialog.destroyAggregation("eventHandlers");
                this._oValueHelpDialog.attachConfirm(this.onMoveReasConfirm.bind(this));
                this._oValueHelpDialog.attachSearch(this.onMoveReasSearch.bind(this));
            }
        },

        onMoveReasConfirm: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oInput = this.getView().byId("motivo");
                if (oInput) {
                    oInput.setValue(oSelectedItem.getTitle());
                    this.getView().getModel("mainModel").setProperty("/currentItem/motivo", oSelectedItem.getKey());
                }
                this._oValueHelpDialog.close();
            }
        },

        onMoveReasSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oFilter = new Filter("text", FilterOperator.Contains, sValue);
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        onMaterialScanned: async function (oEvent) {
            const sScannedValue = oEvent.getParameter("value")?.trim();
            const oModel = this.getView().getModel("mainModel");
            const oMaterialInput = this.getView().byId("material");

            if (!sScannedValue) {
                oModel.setProperty("/currentItem/materialState", "Error");
                oModel.setProperty("/currentItem/materialStateText", "Código de material inválido");
                this.showMessage("Código de material inválido");
                return;
            }

            const oODataModel = this.getView().getModel("API_PRODUCTION_ORDER_2_SRV");
            try {
                const oMatchedMaterial = await new Promise((resolve, reject) => {
                    oODataModel.read("/A_ProductionOrderComponent_4", {
                        filters: [
                            new Filter("Material", FilterOperator.EQ, sScannedValue),
                            new Filter("ManufacturingOrder", FilterOperator.EQ, oModel.getProperty("/savedHeader/ref_doc_no"))
                        ],
                        success: function (oData) { resolve(oData.results[0]); },
                        error: reject
                    });
                });

                if (oMatchedMaterial) {
                    const fAvailableQuantity = parseFloat(oMatchedMaterial.RequiredQuantity) - parseFloat(oMatchedMaterial.WithdrawnQuantity);
                    if (fAvailableQuantity <= 0) {
                        oModel.setProperty("/currentItem/materialState", "Error");
                        oModel.setProperty("/currentItem/materialStateText", "Sin stock disponible");
                        this.showMessage("Sin stock disponible para el material");
                        return;
                    }

                    const isBatchRequired = await this.searchBatchRequired(oMatchedMaterial);
                    const sMaterialText = await this.onSearchMaterialText(oMatchedMaterial);

                    oModel.setProperty("/currentItem", {
                        ...oModel.getProperty("/currentItem"),
                        material: oMatchedMaterial.Material,
                        txt_material: sMaterialText,
                        cantidad: fAvailableQuantity.toFixed(3),
                        um: oMatchedMaterial.BaseUnitSAPCode,
                        centro: oMatchedMaterial.Plant,
                        almacen: oMatchedMaterial.StorageLocation,
                        isBatchRequired: isBatchRequired,
                        MaterialDocument: "",
                        materialState: "Success",
                        materialStateText: "",
                        quantityState: "Success",
                        quantityStateText: ""
                    });
                    this.showMessage(`Material válido: ${sScannedValue} (Stock disponible: ${fAvailableQuantity.toFixed(3)})`);
                } else {
                    oModel.setProperty("/currentItem/material", sScannedValue);
                    oModel.setProperty("/currentItem/materialState", "Error");
                    oModel.setProperty("/currentItem/materialStateText", "Material no encontrado");
                    this.showMessage("Material no encontrado");
                }
            } catch (error) {
                oModel.setProperty("/currentItem/materialState", "Error");
                oModel.setProperty("/currentItem/materialStateText", "Error al validar material");
                this.showMessage("Error al validar material");
            }

            this._updateBatchField();
            if (oMaterialInput) {
                setTimeout(() => oMaterialInput.focus(), 100);
            }
        },

        onQuantityChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const fValue = parseFloat(oInput.getValue());
            const oModel = this.getView().getModel("mainModel");
            const sMaterial = oModel.getProperty("/currentItem/material");
            const sRefDocNo = oModel.getProperty("/savedHeader/ref_doc_no");

            if (!sMaterial) {
                oInput.setValueState("Error").setValueStateText("Material no seleccionado");
                oModel.setProperty("/currentItem/quantityState", "Error");
                oModel.setProperty("/currentItem/quantityStateText", "Material no seleccionado");
                this.showMessage("Selecciona un material válido primero");
                return;
            }

            const oODataModel = this.getView().getModel("API_PRODUCTION_ORDER_2_SRV");
            oODataModel.read("/A_ProductionOrderComponent_4", {
                filters: [
                    new Filter("Material", FilterOperator.EQ, sMaterial),
                    new Filter("ManufacturingOrder", FilterOperator.EQ, sRefDocNo)
                ],
                success: function (oData) {
                    const oMatchedMaterial = oData.results[0];
                    if (oMatchedMaterial) {
                        const fAvailableQuantity = parseFloat(oMatchedMaterial.RequiredQuantity) - parseFloat(oMatchedMaterial.WithdrawnQuantity);
                        if (isNaN(fValue) || fValue <= 0) {
                            oInput.setValueState("Error").setValueStateText("La cantidad debe ser mayor que 0");
                            oModel.setProperty("/currentItem/quantityState", "Error");
                            oModel.setProperty("/currentItem/quantityStateText", "La cantidad debe ser mayor que 0");
                            this.showMessage("La cantidad debe ser mayor que 0");
                        } else if (fValue > fAvailableQuantity) {
                            oInput.setValueState("Error").setValueStateText(`La cantidad no puede exceder el stock disponible (${fAvailableQuantity.toFixed(3)})`);
                            oModel.setProperty("/currentItem/quantityState", "Error");
                            oModel.setProperty("/currentItem/quantityStateText", `La cantidad no puede exceder el stock disponible (${fAvailableQuantity.toFixed(3)})`);
                            this.showMessage(`La cantidad no puede exceder el stock disponible (${fAvailableQuantity.toFixed(3)})`);
                        } else {
                            oInput.setValueState("None");
                            oModel.setProperty("/currentItem/quantityState", "None");
                            oModel.setProperty("/currentItem/quantityStateText", "");
                        }
                    } else {
                        oInput.setValueState("Error").setValueStateText("Material no encontrado");
                        oModel.setProperty("/currentItem/quantityState", "Error");
                        oModel.setProperty("/currentItem/quantityStateText", "Material no encontrado");
                        this.showMessage("Material no encontrado");
                    }
                }.bind(this),
                error: function () {
                    oInput.setValueState("Error").setValueStateText("Error al validar material");
                    oModel.setProperty("/currentItem/quantityState", "Error");
                    oModel.setProperty("/currentItem/quantityStateText", "Error al validar material");
                    this.showMessage("Error al validar material");
                }.bind(this)
            });
        },

        onFetchDetails: async function () {
            const oModel = this.getView().getModel("mainModel");
            const sMaterial = oModel.getProperty("/currentItem/material");
            if (!sMaterial) {
                this.showMessage("Ingresa un material para buscar detalles");
                return;
            }

            this.getView().setBusy(true);
            try {
                const oODataModel = this.getView().getModel("productApi");
                const oDetails = await new Promise((resolve, reject) => {
                    oODataModel.read("/Product", {
                        filters: [new Filter("Material", FilterOperator.EQ, sMaterial)],
                        success: function (oData) { resolve(oData.results[0]); },
                        error: reject
                    });
                });

                if (oDetails) {
                    const sMaterialText = await this.onSearchMaterialText({ Material: sMaterial });
                    oModel.setProperty("/currentItem", {
                        ...oModel.getProperty("/currentItem"),
                        txt_material: sMaterialText,
                        batch: oDetails.Batch || "",
                        centro: oDetails.Plant || "",
                        almacen: oDetails.StorageLocation || "",
                        MaterialDocument: "",
                        isBatchRequired: oDetails.IsBatchManagementRequired || false,
                        materialState: "Success",
                        materialStateText: ""
                    });
                    this._updateBatchField();
                    this.showMessage("Detalles del material cargados");
                } else {
                    oModel.setProperty("/currentItem/materialState", "Error");
                    oModel.setProperty("/currentItem/materialStateText", "Material no encontrado");
                    this.showMessage("No se encontraron detalles para el material");
                }
            } catch (error) {
                MessageBox.error("Error al cargar detalles: " + (error.message || "Desconocido"));
            } finally {
                this.getView().setBusy(false);
            }
        },

        onBuscarDetalle: async function (oEvent) {
            const oModel = this.getView().getModel("mainModel");
            const sMaterial = oModel.getProperty("/currentItem/material");
            const sBatch = oModel.getProperty("/currentItem/batch");
            const sRefDocNo = oModel.getProperty("/savedHeader/ref_doc_no");

            if (!sMaterial) {
                oModel.setProperty("/currentItem/materialState", "Error");
                oModel.setProperty("/currentItem/materialStateText", "Ingresa un material válido");
                this.showMessage("Ingresa un material válido");
                return;
            }

            this.getView().setBusy(true);
            try {
                const oODataModel = this.getView().getModel("API_PRODUCTION_ORDER_2_SRV");
                const oDetails = await new Promise((resolve, reject) => {
                    oODataModel.read("/A_ProductionOrderComponent_4", {
                        filters: [
                            new Filter("Material", FilterOperator.EQ, sMaterial),
                            new Filter("ManufacturingOrder", FilterOperator.EQ, sRefDocNo)
                        ],
                        success: function (oData) { resolve(oData.results[0]); },
                        error: reject
                    });
                });

                if (oDetails) {
                    const fAvailableQuantity = parseFloat(oDetails.RequiredQuantity) - parseFloat(oDetails.WithdrawnQuantity);
                    const isBatchRequired = await this.searchBatchRequired(oDetails);
                    const sMaterialText = await this.onSearchMaterialText(oDetails);

                    oModel.setProperty("/currentItem", {
                        ...oModel.getProperty("/currentItem"),
                        material: oDetails.Material,
                        txt_material: sMaterialText,
                        cantidad: fAvailableQuantity.toFixed(3),
                        um: oDetails.BaseUnitSAPCode,
                        centro: oDetails.Plant,
                        almacen: oDetails.StorageLocation,
                        isBatchRequired: isBatchRequired,
                        batch: isBatchRequired && sBatch ? sBatch : "",
                        MaterialDocument: "",
                        materialState: "Success",
                        materialStateText: "",
                        quantityState: "Success",
                        quantityStateText: ""
                    });

                    if (isBatchRequired && sBatch) {
                        const aBatches = await this.onSearchBatchList({ material: sMaterial });
                        const bValidBatch = aBatches.some(batch => batch.Batch === sBatch);
                        if (!bValidBatch) {
                            oModel.setProperty("/currentItem/materialState", "Error");
                            oModel.setProperty("/currentItem/materialStateText", "Lote inválido");
                            this.showMessage("Lote inválido");
                        }
                    }

                    this.showMessage("Detalles del material cargados");
                } else {
                    oModel.setProperty("/currentItem/materialState", "Error");
                    oModel.setProperty("/currentItem/materialStateText", "Material no encontrado");
                    this.showMessage("Material no encontrado");
                }
            } catch (error) {
                oModel.setProperty("/currentItem/materialState", "Error");
                oModel.setProperty("/currentItem/materialStateText", "Error al buscar detalles");
                this.showMessage("Error al buscar detalles: " + (error.message || "Desconocido"));
            } finally {
                this.getView().setBusy(false);
                this._updateBatchField();
            }
        },

        onLiveChangeMaterial: function (oEvent) {
            const sValue = oEvent.getParameter("value")?.trim();
            const oModel = this.getView().getModel("mainModel");
            const oInput = oEvent.getSource();

            if (!sValue) {
                oModel.setProperty("/currentItem/materialState", "Error");
                oModel.setProperty("/currentItem/materialStateText", "Ingresa un material válido");
                oInput.setValueState("Error");
                oInput.setValueStateText("Ingresa un material válido");
            } else {
                oModel.setProperty("/currentItem/materialState", "None");
                oModel.setProperty("/currentItem/materialStateText", "");
                oInput.setValueState("None");
            }
        },

        onLiveChangeLote: function (oEvent) {
            const sValue = oEvent.getParameter("value")?.trim();
            const oModel = this.getView().getModel("mainModel");
            const oInput = oEvent.getSource();
            const bIsBatchRequired = oModel.getProperty("/currentItem/isBatchRequired");

            if (bIsBatchRequired && !sValue) {
                oModel.setProperty("/currentItem/materialState", "Error");
                oModel.setProperty("/currentItem/materialStateText", "Ingresa un lote válido");
                oInput.setValueState("Error");
                oInput.setValueStateText("Ingresa un lote válido");
            } else {
                oModel.setProperty("/currentItem/materialState", "None");
                oModel.setProperty("/currentItem/materialStateText", "");
                oInput.setValueState("None");
            }
        },

        showMessage: function (sMessage) {
            MessageToast.show(sMessage, { duration: 3000 });
        }
    });
});