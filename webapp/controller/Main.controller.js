sap.ui.define([
    "logaligroup/mapeobapi/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("logaligroup.mapeobapi.controller.Main", {

        /**
         * Inicializa la vista, configura modelos y carga datos iniciales
         */
        onInit: async function () {

            const oJSONModels = {
                mainModel: {
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
                },
                claseMovModel: []
            };


            this.initializeModels(this.getView(), oJSONModels);


            this.navigateToTab("Cabecera");


            await this._loadODataData();
            this._applyDisplayConfiguration();
        },

        /**
         * Carga datos de clases de movimiento desde el servicio OData y las asigna al modelo claseMovModel
         */
        _loadODataData: async function () {
            try {

                const aClaseMovimientos = await this.readOData("ZSB_HANDHELD_V2", "ClaseMov");

                const aResults = [{ ClaseMovimiento: "", Descripcion: "Selecciona..." }].concat(
                    aClaseMovimientos.map(item => ({
                        ClaseMovimiento: item.ClaseMovimiento,
                        Descripcion: item.Descripcion
                    }))
                );

                this.getView().getModel("claseMovModel").setData(aResults);
                console.log("Clases de movimiento cargadas correctamente");
            } catch (error) {
                console.error("Error al cargar datos OData:", error);

                this.getView().getModel("claseMovModel").setData([]);
                this.showErrorMessage("Error al cargar clases de movimiento. El selector puede no funcionar.");
            }
        },

        /**
         * Aplica configuraciones de visualización a controles de cabecera y posiciones
         */
        _applyDisplayConfiguration: function () {

            const aHeaderControls = [
                { id: "referenceType", key: "operacion_almacen" },
                { id: "moveTypeManual", key: "claseMov" },
                { id: "docDate", key: "fecha_doc" },
                { id: "pstngDate", key: "fecha_cont" },
                { id: "refDocNo", key: "referencia" },
                { id: "headerTxt", key: "texto_cabecera" }
            ];
            // Definir controles de posiciones
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


            this.applyDisplayConfiguration(aHeaderControls, "Header");
            this.applyDisplayConfiguration(aPosicionControls, "Posiciones");
            this.updateBatchField(); // Actualizar campo de lote
        },

        /**
         * Maneja el cambio de selección en el dropdown de tipo de movimiento
         */
        onReferenceTypeChange: function (oEvent) {
            const oModel = this.getView().getModel("mainModel");
            const sClaseMovimiento = oEvent.getParameter("selectedItem")?.getKey() || "";
            const sDescription = oEvent.getParameter("selectedItem")?.getText() || "";

            // Actualizar datos de la cabecera en el modelo
            oModel.setProperty("/header/move_type", sClaseMovimiento);
            oModel.setProperty("/header/textClaseMov", sDescription);
            oModel.setProperty("/savedHeader", {
                ...oModel.getProperty("/header"),
                movementDescription: sClaseMovimiento ? `${sClaseMovimiento} - ${sDescription}` : ""
            });

            const oDisplayModel = this.getView().getModel("oDisplayModel");
            const c_601 = "601", c_602 = "602", c_261 = "261", c_262 = "262";
            const c_551 = "551", c_552 = "552", c_201 = "201", c_202 = "202", c_999 = "999";

            // Ajustar visibilidad de campos según el tipo de movimiento
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

            // Actualizar campo de texto no editable y limpiar referencia
            this.getView().byId("moveTypeManual").setValue(sClaseMovimiento);
            this.getView().byId("refDocNo").setValue("");
            this._resetCurrentItem();
            this._applyDisplayConfiguration();
        },

        /**
         * Valida los campos de la cabecera antes de continuar
         */
        validateHeaderFields: function () {
            const oDisplayModel = this.getView().getModel("oDisplayModel").getData();

            const aFields = [
                { id: "referenceType", prop: "move_type", label: this.getResourceBundle().getText("salidaMercancia") },
                { id: "docDate", prop: "doc_date", label: this.getResourceBundle().getText("fechaDocumento") },
                { id: "pstngDate", prop: "pstng_date", label: this.getResourceBundle().getText("fechaContabilizacion") },
                { id: "refDocNo", prop: "ref_doc_no", label: this.getResourceBundle().getText("referencia") },
                { id: "headerTxt", prop: "header_txt", label: this.getResourceBundle().getText("textoCabecera") }
            ];

            this.getView().setBusy(true);

            const bValid = this.validateFields(aFields, "/header", oDisplayModel.Header);
            this.getView().setBusy(false);
            return bValid;
        },

        /**
         * Maneja el evento del botón "Continuar" en la cabecera
         */
        onContinueHeader: async function () {
            this.getView().setBusy(true);

            // Validar campos de la cabecera
            if (!this.validateHeaderFields()) {
                this.getView().setBusy(false);
                return;
            }

            const oModel = this.getView().getModel("mainModel");
            const oDisplayModel = this.getView().getModel("oDisplayModel").getData();
            const sReference = oModel.getProperty("/header/ref_doc_no");

            // Verificar si la referencia es requerida y está vacía
            if (oDisplayModel.Header.referencia && !sReference) {
                this.showMessage("Ingresa un documento de referencia");
                this.navigateToTab("Cabecera");
                this.getView().setBusy(false);
                return;
            }

            try {
                const iPageSize = 5000;
                const oBundle = this.getResourceBundle();

                const oRefItems = await this.readOData("API_PRODUCTION_ORDER_2_SRV", "A_ProductionOrderComponent_4", [
                    new Filter("ManufacturingOrder", FilterOperator.EQ, sReference)
                ], { "$top": iPageSize });


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

                // Actualizar modelo con ítems y cabecera guardada
                oModel.setProperty("/ReferenceItems", oItems);
                oModel.setProperty("/savedHeader", {
                    ...oModel.getProperty("/header"),
                    movementDescription: oModel.getProperty("/header/move_type") ?
                        `${oModel.getProperty("/header/move_type")} - ${oModel.getProperty("/header/textClaseMov")}` : ""
                });

                // Cargar y abrir diálogo de ítems
                const oDialog = await this.loadFragmentDialog("logaligroup.mapeobapi.fragments.ItemsDialog", "oItemsDialog");
                oDialog.open();
                this.showMessage(`Se encontraron ${oItems.length} ítems para la referencia ${sReference}`);
            } catch (error) {
                this.showErrorMessage("Error al cargar ítems: " + (error.message || "Desconocido"));
            } finally {
                this.getView().setBusy(false);
            }
        },

        /**
         * Verifica si un material requiere gestión de lotes
         */
        searchBatchRequired: async function (element) {
            try {

                const oData = await this.readOData("productApi", "Product", [
                    new Filter("ManufacturingOrder", FilterOperator.EQ, element.ManufacturingOrder),
                    new Filter("Material", FilterOperator.EQ, element.Material)
                ]);
                return oData[0]?.IsBatchManagementRequired || false;
            } catch (error) {
                console.error("Error en searchBatchRequired:", error);
                return false;
            }
        },

        /**
         * Obtiene la descripción de un material
         */
        onSearchMaterialText: async function (element) {
            try {

                const oData = await this.readOData("productApi", "ProductDescription", [
                    new Filter("ManufacturingOrder", FilterOperator.EQ, element.ManufacturingOrder),
                    new Filter("Material", FilterOperator.EQ, element.Material)
                ]);
                return oData[0]?.ProductDescription || "";
            } catch (error) {
                console.error("Error en onSearchMaterialText:", error);
                return "";
            }
        },

        /**
         * Busca la lista de lotes para un material
         */
        onSearchBatchList: async function (element) {
            try {

                const oData = await this.readOData("apiBatch", "Batch", [
                    new Filter("Material", FilterOperator.EQ, element.material)
                ]);
                const oBatchModel = this.getView().getModel("BatchList");
                if (!oBatchModel) {

                    this.getView().setModel(new sap.ui.model.json.JSONModel(oData), "BatchList");
                } else {

                    oBatchModel.setData(oData);
                }
                return oData;
            } catch (error) {
                console.error("Error en onSearchBatchList:", error);
                return [];
            }
        },

        /**
         * Procesa un ítem seleccionado y actualiza el ítem actual
         */
        onProcesarItem: async function (oEvent) {
            const oItem = oEvent.getSource().getBindingContext("mainModel")?.getObject();
            if (!oItem) {
                this.showErrorMessage("Error: No se pudo obtener el ítem seleccionado");
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

            // Cerrar diálogo de ítems
            this.closeDialog("oItemsDialog");
            this.navigateToTab("Posicion");
            this.updateBatchField();
        },

        /**
         * Maneja la selección de una pestaña en el IconTabBar
         */
        onTabSelect: function (oEvent) {
            const sKey = oEvent.getParameter("key");
            const oModel = this.getView().getModel("mainModel");

            if (sKey === "Posicion" && !oModel.getProperty("/savedHeader/move_type")) {
                this.showMessage("Primero completa la cabecera");
                this.navigateToTab("Cabecera");
            }
        },

        /**
         * Valida los datos de un ítem antes de guardarlo
         */
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
            // Validar motivo para movimiento 551
            if (sMoveType === "551" && !oItem.motivo?.trim()) {
                this.showMessage("El campo Motivo es obligatorio");
                return false;
            }
            // Validar lote si es requerido
            if (oItem.isBatchRequired && !oItem.batch?.trim()) {
                this.showMessage("El campo Lote es obligatorio para este material");
                return false;
            }
            return true;
        },

        /**
         * Reinicia los datos del ítem actual
         */
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

        /**
         * Guarda un ítem en la lista de posiciones
         */
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

            // Refrescar tabla de ítems
            const oTable = this.getView().byId("itemsTable");
            if (oTable) {
                oTable.getBinding("items").refresh();
            }


            this._resetCurrentItem();
            this.showMessage("Ítem guardado");
            this.navigateToTab("OrdenCompleta");
        },

        /**
         * Cancela la entrada de un ítem
         */
        onCancelItem: function () {
            this._resetCurrentItem();
            this.showMessage("Entrada cancelada");
            const oMaterialInput = this.getView().byId("material");
            if (oMaterialInput) {
                setTimeout(() => oMaterialInput.focus(), 100);
            }
        },

        /**
         * Cancela la entrada de la cabecera
         */
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

        /**
         * Reinicia todo el proceso de datos
         */
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
            this.navigateToTab("Cabecera");
            this.showMessage("Proceso reiniciado");
        },

        /**
         * Añade un nuevo componente y navega a la pestaña de posición
         */
        onAddComponent: function () {
            this._resetCurrentItem();
            this.navigateToTab("Posicion");
        },

        /**
         * Elimina un ítem de la lista de posiciones
         */
        onDeleteItem: function (oEvent) {
            const oModel = this.getView().getModel("mainModel");
            const oItem = oEvent.getSource().getBindingContext("mainModel").getObject();
            const aPositions = oModel.getProperty("/Positions");
            const iIndex = aPositions.indexOf(oItem);

            if (iIndex !== -1) {
                // Mostrar diálogo de confirmación
                sap.m.MessageBox.confirm(this.getResourceBundle().getText("confirmDeleteItem"), {
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.OK) {
                            // Eliminar ítem
                            aPositions.splice(iIndex, 1);
                            oModel.setProperty("/Positions", aPositions);
                            oModel.setProperty("/itemCount", aPositions.length);
                            this.showMessage("Ítem eliminado");
                            // Refrescar tabla
                            const oTable = this.getView().byId("itemsTable");
                            if (oTable) {
                                oTable.getBinding("items").refresh();
                            }
                        }
                    }.bind(this)
                });
            }
        },

        /**
         * Maneja la selección de un ítem de la lista
         */
        onItemSelected: function (oEvent) {
            const oItem = oEvent.getParameter("listItem").getBindingContext("mainModel").getObject();
            const oModel = this.getView().getModel("mainModel");

            // Actualizar ítem actual con datos seleccionados
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

            this.navigateToTab("Posicion");
            this.updateBatchField();
        },

        /**
         * Crea un movimiento de material enviando datos al servicio OData
         */
        onCreateMov: async function () {
            this.getView().setBusy(true);

            try {
                const oModel = this.getView().getModel("mainModel");
                const oODataModel = this.getView().getModel("API_MATERIAL_DOCUMENT_SRV");
                const oBundle = this.getResourceBundle();
                const oHeader = oModel.getProperty("/savedHeader");
                const aPositions = oModel.getProperty("/Positions") || [];

                // Verificar si hay posiciones
                if (!aPositions.length) {
                    this.showErrorMessage(oBundle.getText("error.noItems"));
                    this.getView().setBusy(false);
                    return;
                }

                const oDate = oHeader.pstng_date + "T00:00:00";
                const oGoodMovement = oHeader.move_type;

                // Verificar tipo de movimiento
                if (!oGoodMovement) {
                    this.showErrorMessage(oBundle.getText("error.missingMovement"));
                    this.getView().setBusy(false);
                    return;
                }

                // Construir payload para el servicio OData
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

                // Obtener token CSRF
                const sToken = await this.fetchCsrfToken("API_MATERIAL_DOCUMENT_SRV");
                // Enviar solicitud POST
                const oResponse = await new Promise((resolve, reject) => {
                    oODataModel.create("/A_MaterialDocumentHeader", oRequestJson, {
                        headers: { "X-CSRF-Token": sToken },
                        success: function (oData, oResponse) {
                            resolve({ data: oData, response: oResponse });
                        },
                        error: reject
                    });
                });

                // Extraer número de documento de material
                const sMaterialDocument = oResponse.data.MaterialDocument || oResponse.response.headers["sap-message"]?.match(/"MaterialDocument":"([^"]+)"/)?.[1] || "";

                // Actualizar posiciones con el documento de material
                const aUpdatedPositions = aPositions.map(item => ({
                    ...item,
                    MaterialDocument: sMaterialDocument
                }));
                oModel.setProperty("/Positions", aUpdatedPositions);

                // Mostrar mensaje de éxito
                this.showMessage(oBundle.getText("success.movCreated") + ` (Documento: ${sMaterialDocument})`);
                console.log("Respuesta del POST:", oResponse);
                this._resetCurrentItem();
                oModel.setProperty("/itemCount", aUpdatedPositions.length);
                // Refrescar tabla
                const oTable = this.getView().byId("itemsTable");
                if (oTable) {
                    oTable.getBinding("items").refresh();
                }
            } catch (error) {
                console.error("Error en onCreateMov:", error);
                this.showErrorMessage(oBundle.getText("error.unexpected"));
            } finally {
                this.getView().setBusy(false);
            }
        },

        /**
         * Abre el diálogo de ayuda para selección de motivos
         */
        onMoveReasValueHelp: async function () {
            try {
                const oDialog = await this.loadFragmentDialog("logaligroup.mapeobapi.fragments.MoveReasValueHelp", "_oValueHelpDialog");
                this._bindValueHelpDialog();
                oDialog.open();
            } catch (error) {
                this.showErrorMessage("Error al cargar el diálogo de ayuda de motivos: " + error.message);
            }
        },

        /**
         * Vincula datos al diálogo de ayuda de motivos
         */
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

        /**
         * Maneja la confirmación de selección en el diálogo de motivos
         */
        onMoveReasConfirm: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oInput = this.getView().byId("motivo");
                if (oInput) {
                    oInput.setValue(oSelectedItem.getTitle());
                    this.getView().getModel("mainModel").setProperty("/currentItem/motivo", oSelectedItem.getKey());
                }

                this.closeDialog("_oValueHelpDialog");
            }
        },

        /**
         * Filtra los motivos en el diálogo de ayuda según la búsqueda
         */
        onMoveReasSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oFilter = new Filter("text", FilterOperator.Contains, sValue);
            // Aplicar filtro a la lista
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        /**
         * Valida un material escaneado y actualiza los datos del ítem
         */
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

            try {
                const oMatchedMaterial = await this.readOData("API_PRODUCTION_ORDER_2_SRV", "A_ProductionOrderComponent_4", [
                    new Filter("Material", FilterOperator.EQ, sScannedValue),
                    new Filter("ManufacturingOrder", FilterOperator.EQ, oModel.getProperty("/savedHeader/ref_doc_no"))
                ]);

                if (oMatchedMaterial[0]) {
                    const fAvailableQuantity = parseFloat(oMatchedMaterial[0].RequiredQuantity) - parseFloat(oMatchedMaterial[0].WithdrawnQuantity);
                    if (fAvailableQuantity <= 0) {
                        oModel.setProperty("/currentItem/materialState", "Error");
                        oModel.setProperty("/currentItem/materialStateText", "Sin stock disponible");
                        this.showMessage("Sin stock disponible para el material");
                        return;
                    }

                    const isBatchRequired = await this.searchBatchRequired(oMatchedMaterial[0]);
                    const sMaterialText = await this.onSearchMaterialText(oMatchedMaterial[0]);

                    // Actualizar ítem actual
                    oModel.setProperty("/currentItem", {
                        ...oModel.getProperty("/currentItem"),
                        material: oMatchedMaterial[0].Material,
                        txt_material: sMaterialText,
                        cantidad: fAvailableQuantity.toFixed(3),
                        um: oMatchedMaterial[0].BaseUnitSAPCode,
                        centro: oMatchedMaterial[0].Plant,
                        almacen: oMatchedMaterial[0].StorageLocation,
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

            this.updateBatchField();
            if (oMaterialInput) {
                setTimeout(() => oMaterialInput.focus(), 100);
            }
        },

        /**
         * Valida la cantidad ingresada para un material
         */
        onQuantityChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const fValue = parseFloat(oInput.getValue());
            const oModel = this.getView().getModel("mainModel");
            const sMaterial = oModel.getProperty("/currentItem/material");
            const sRefDocNo = oModel.getProperty("/savedHeader/ref_doc_no");

            // Verificar si hay material seleccionado
            if (!sMaterial) {
                oInput.setValueState("Error").setValueStateText("Material no seleccionado");
                oModel.setProperty("/currentItem/quantityState", "Error");
                oModel.setProperty("/currentItem/quantityStateText", "Material no seleccionado");
                this.showMessage("Selecciona un material válido primero");
                return;
            }

            // Consultar datos del material
            this.readOData("API_PRODUCTION_ORDER_2_SRV", "A_ProductionOrderComponent_4", [
                new Filter("Material", FilterOperator.EQ, sMaterial),
                new Filter("ManufacturingOrder", FilterOperator.EQ, sRefDocNo)
            ]).then(oData => {
                const oMatchedMaterial = oData[0];
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
            }).catch(() => {
                oInput.setValueState("Error").setValueStateText("Error al validar material");
                oModel.setProperty("/currentItem/quantityState", "Error");
                oModel.setProperty("/currentItem/quantityStateText", "Error al validar material");
                this.showMessage("Error al validar material");
            });
        },

        /**
         * Obtiene detalles de un material
         */
        onFetchDetails: async function () {
            const oModel = this.getView().getModel("mainModel");
            const sMaterial = oModel.getProperty("/currentItem/material");
            if (!sMaterial) {
                this.showMessage("Ingresa un material para buscar detalles");
                return;
            }

            this.getView().setBusy(true);
            try {
                const oDetails = await this.readOData("productApi", "Product", [
                    new Filter("Material", FilterOperator.EQ, sMaterial)
                ]);

                if (oDetails[0]) {
                    const sMaterialText = await this.onSearchMaterialText({ Material: sMaterial });
                    oModel.setProperty("/currentItem", {
                        ...oModel.getProperty("/currentItem"),
                        txt_material: sMaterialText,
                        batch: oDetails[0].Batch || "",
                        centro: oDetails[0].Plant || "",
                        almacen: oDetails[0].StorageLocation || "",
                        MaterialDocument: "",
                        isBatchRequired: oDetails[0].IsBatchManagementRequired || false,
                        materialState: "Success",
                        materialStateText: ""
                    });
                    this.updateBatchField();
                    this.showMessage("Detalles del material cargados");
                } else {
                    oModel.setProperty("/currentItem/materialState", "Error");
                    oModel.setProperty("/currentItem/materialStateText", "Material no encontrado");
                    this.showMessage("No se encontraron detalles para el material");
                }
            } catch (error) {
                this.showErrorMessage("Error al cargar detalles: " + (error.message || "Desconocido"));
            } finally {
                this.getView().setBusy(false);
            }
        },

        /**
         * Busca detalles de un material y valida el lote si es necesario
         */
        onBuscarDetalle: async function () {
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
                const oDetails = await this.readOData("API_PRODUCTION_ORDER_2_SRV", "A_ProductionOrderComponent_4", [
                    new Filter("Material", FilterOperator.EQ, sMaterial),
                    new Filter("ManufacturingOrder", FilterOperator.EQ, sRefDocNo)
                ]);

                if (oDetails[0]) {
                    const fAvailableQuantity = parseFloat(oDetails[0].RequiredQuantity) - parseFloat(oDetails[0].WithdrawnQuantity);
                    const isBatchRequired = await this.searchBatchRequired(oDetails[0]);
                    const sMaterialText = await this.onSearchMaterialText(oDetails[0]);

                    // Actualizar ítem actual
                    oModel.setProperty("/currentItem", {
                        ...oModel.getProperty("/currentItem"),
                        material: oDetails[0].Material,
                        txt_material: sMaterialText,
                        cantidad: fAvailableQuantity.toFixed(3),
                        um: oDetails[0].BaseUnitSAPCode,
                        centro: oDetails[0].Plant,
                        almacen: oDetails[0].StorageLocation,
                        isBatchRequired: isBatchRequired,
                        batch: isBatchRequired && sBatch ? sBatch : "",
                        MaterialDocument: "",
                        materialState: "Success",
                        materialStateText: "",
                        quantityState: "Success",
                        quantityStateText: ""
                    });

                    // Validar lote si es requerido
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
                this.updateBatchField();
            }
        },

        /**
         * Valida el material ingresado en tiempo real
         */
        onLiveChangeMaterial: function (oEvent) {
            const sValue = oEvent.getParameter("value")?.trim();
            const oModel = this.getView().getModel("mainModel");
            const oInput = oEvent.getSource();

            // Validar valor
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

        /**
         * Valida el lote ingresado en tiempo real
         */
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
        }
    });
});