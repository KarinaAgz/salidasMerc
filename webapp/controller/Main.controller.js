sap.ui.define([
    "logaligroup/mapeobapi/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/library",
    "jquery.sap.global"
], function (BaseController, JSONModel, Filter, FilterOperator, Fragment, MessageBox, MessageToast, CoreLibrary, jQuery) {
    "use strict";

    return BaseController.extend("logaligroup.mapeobapi.controller.Main", {
        onInit: async function () {
            const oModel = new JSONModel({
                header: {
                    pstng_date: new Date().toISOString().split("T")[0],
                    doc_date: new Date().toISOString().split("T")[0],
                    ref_doc_no: "",
                    header_txt: "",
                    move_type: "",
                    reference_type: ""
                },
                savedHeader: {},
                currentItem: {
                    material: "",
                    materialDescription: "",
                    entry_qnt: "",
                    entry_uom: "",
                    batch: "",
                    plant: "",
                    stge_loc: "",
                    costcenter: "",
                    move_reas: "",
                    position_txt: "",
                    position_txt_history: "",
                    isBatchRequired: false,
                    materialState: "None", // Estado de validación del material
                    materialStateText: "",  // Texto de error del material
                    quantityState: "None", // Nueva propiedad
                    quantityStateText: ""  // Nueva propiedad
                },
                items: [],
                itemCount: 0,
                ReferenceItems: [],
                config: {
                    unitOfMeasureISO: {},
                    moveReasons: [],
                    displayConfig: {},
                    claseMovimientos: [],
                    materialInfo: [],
                    productionOrderComponents: [],
                    materialDetails: []
                }
            });
            this.getView().setModel(oModel, "mainModel");

            /*** Crear modelo para clases de movimiento */
            const oClaseMovModel = new JSONModel([]);
            this.getView().setModel(oClaseMovModel, "claseMovModel");

            /*** Seleccionar pestaña Cabecera por defecto */
            const oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Cabecera");

            /*** Cargar datos mock y configuración de visualización */
            await this._loadMockData();
            await this._loadDisplayConfiguration();
        },

        /***
         * Carga datos mock desde archivos JSON en localService/mockdata para
         *poblar los modelos con clases de movimiento, unidades de medida, motivos,
         *  información de materiales y componentes de órdenes de producción.
         */
        _loadMockData: async function () {
            const oModel = this.getView().getModel("mainModel");
            const oClaseMovModel = this.getView().getModel("claseMovModel");
            let oMockModel = this.getView().getModel("mockModel");

            if (!oMockModel) {
                oMockModel = new JSONModel();
                this.getView().setModel(oMockModel, "mockModel");
            }

            try {
                await oMockModel.loadData("/localService/mockdata/Z_C_CLASEMOV.json");
                const aClaseMovimientos = [{ ClaseMovimiento: "", Descripcion: "Selecciona..." }];
                (oMockModel.getProperty("/") || []).forEach(item => {
                    aClaseMovimientos.push({
                        ClaseMovimiento: item.ClaseMovimiento,
                        Descripcion: item.Descripcion
                    });
                });
                oClaseMovModel.setData(aClaseMovimientos);
                oModel.setProperty("/config/claseMovimientos", aClaseMovimientos);

                /*** Cargar unidades de medida */
                await oMockModel.loadData("/localService/mockdata/SAP__UnitsOfMeasure.json");
                const oUOM = {};
                (oMockModel.getProperty("/results") || []).forEach(item => {
                    oUOM[item.UnitCode] = item.ISOCode;
                });
                oModel.setProperty("/config/unitOfMeasureISO", oUOM);

                /*** Cargar motivos de movimiento */
                await oMockModel.loadData("/localService/mockdata/SAP__ValueHelpSet.json");
                const aMotivos = [{ key: "", text: "Selecciona..." }];
                (oMockModel.getProperty("/results") || []).forEach(item => {
                    if (item.VALUEHELP === "MoveReason" && item.FIELD_NAME === "551") {
                        aMotivos.push({ key: item.FIELD_VALUE, text: item.DESCRIPTION });
                    }
                });
                oModel.setProperty("/config/moveReasons", aMotivos);

                /*** Cargar información de materiales */
                await oMockModel.loadData("/localService/mockdata/A_MaterialInfo.json");
                oModel.setProperty("/config/materialInfo", oMockModel.getProperty("/d/results") || []);

                /*** Cargar componentes de órdenes de producción */
                await oMockModel.loadData("/localService/mockdata/A_ProductionOrderComponent_4.json");
                oModel.setProperty("/config/productionOrderComponents", oMockModel.getProperty("/d/results") || []);

                /*** Cargar detalles de materiales */
                await oMockModel.loadData("/localService/mockdata/MaterialDetails.json");
                oModel.setProperty("/config/materialDetails", oMockModel.getProperty("/results") || []);

                console.log("Datos mock cargados correctamente");
            } catch (error) {
                console.error("Error al cargar datos mock:", error);
                oClaseMovModel.setData([]);
                oModel.setProperty("/config/claseMovimientos", []);
                oModel.setProperty("/config/unitOfMeasureISO", {});
                oModel.setProperty("/config/moveReasons", []);
                oModel.setProperty("/config/materialInfo", []);
                oModel.setProperty("/config/productionOrderComponents", []);
                oModel.setProperty("/config/materialDetails", []);
                MessageBox.error("Error al cargar datos de configuración. Algunas funciones pueden no estar disponibles.");
            }
        },

        /***
         * Carga la configuración de visualización desde utils/DisplayConfiguration.json
         *  para determinar qué campos de cabecera y posición 
         */
        _loadDisplayConfiguration: async function () {
            const oModel = this.getView().getModel("mainModel");
            let oMockModel = this.getView().getModel("mockModel");

            if (!oMockModel) {
                oMockModel = new JSONModel();
                this.getView().setModel(oMockModel, "mockModel");
            }

            try {
                const response = await jQuery.ajax({
                    url: "/utils/DisplayConfiguration.json",
                    method: "GET",
                    dataType: "json"
                });
                oModel.setProperty("/config/displayConfig", response);
                console.log("Configuración de visualización cargada desde /utils/DisplayConfiguration.json:", response);
                this._applyDisplayConfiguration();
            } catch (error) {
                console.error("Error al cargar DisplayConfiguration.json desde /utils/:", error);
                oModel.setProperty("/config/displayConfig", {});
                MessageBox.error("Error al cargar configuración de visualización. Los campos pueden no mostrarse correctamente.");
            }
        },

        /***
         *  Aplica la configuración de visualización, ajustando la visibilidad de etiquetas
         *   de campos en las pestañas Cabecera y Posición según DisplayConfiguration.json.
         */
        _applyDisplayConfiguration: function () {
            const oModel = this.getView().getModel("mainModel");
            const oConfig = oModel.getProperty("/config/displayConfig") || {};
            const oView = this.getView();

            /*** Configurar visibilidad de campos de cabecera */
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
                if (oControl && oConfig.Header?.[key] !== undefined) {
                    let oLabel = null;
                    const oParent = oControl.getParent();
                    if (oParent && oParent.isA("sap.ui.layout.form.FormElement") && typeof oParent.getLabel === "function") {
                        oLabel = oParent.getLabel();
                    } else {
                        const aSiblings = oParent?.getAggregation("content") || [];
                        oLabel = aSiblings?.find(sibling => sibling.isA("sap.m.Label") && sibling.getLabelFor() === id);
                    }
                    if (oLabel) {
                        oLabel.setVisible(oConfig.Header[key]);
                        oControl.setVisible(oConfig.Header[key]);
                    } else {
                        console.warn(`No se encontró etiqueta para el control con ID ${id}`);
                    }
                }
            });

            /*** Configurar visibilidad de campos de posición */
            const aPosicionControls = [
                { id: "material", key: "material" },
                { id: "materialDesc", key: "descripcion_material" },
                { id: "entryQnt", key: "cantidad" },
                { id: "entryUom", key: "um" },
                { id: "batch", key: "lote" },
                { id: "plant", key: "centro" },
                { id: "stgeLoc", key: "almacen" },
                { id: "costcenter", key: "ceco" },
                { id: "moveReas", key: "motivo" }, // Añadido el campo Motivo
                { id: "positionTxt", key: "txt_posicion" }
            ];

            aPosicionControls.forEach(({ id, key }) => {
                const oControl = oView.byId(id);
                if (oConfig.Posiciones?.[key] !== undefined) {
                    let oLabel = null;
                    const oParent = oControl.getParent();
                    if (oParent && oParent.isA("sap.ui.layout.form.FormElement") && typeof oParent.getLabel === "function") {
                        oLabel = oParent.getLabel();
                    } else {
                        const aSiblings = oParent?.getAggregation("content") || [];
                        oLabel = aSiblings?.find(sibling => sibling.isA("sap.m.Label") && sibling.getLabelFor() === id);
                    }
                    if (oLabel) {
                        oLabel.setVisible(oConfig.Posiciones[key]);
                        oControl.setVisible(oConfig.Posiciones[key]);
                        console.log(`Control ${id} y su etiqueta establecidos como visibles: ${oConfig.Posiciones[key]}`);
                    } else {
                        console.warn(`No se encontró etiqueta para el control con ID ${id}`);
                    }
                }
            });

            this._updateBatchField();
        },

        /***
         *
         * Habilita o deshabilita el campo de lote en la pestaña Posición según
         * si el material requiere gestión de lotes (isBatchRequired).
         */
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

        /***
         *
         * Actualiza los campos de cabecera y posición cuando cambia el tipo de referencia,
         * restableciendo el ítem actual y aplicando la configuración de visualización.
         * @param {sap.ui.base.Event} oEvent - Evento del cambio en el control Select.
         */
        onReferenceTypeChange: function (oEvent) {
            const oModel = this.getView().getModel("mainModel");
            const sClaseMovimiento = oEvent.getParameter("selectedItem")?.getKey() || "";
            const sDescription = oEvent.getParameter("selectedItem")?.getText() || "";

            oModel.setProperty("/header/reference_type", sDescription);
            oModel.setProperty("/header/move_type", sClaseMovimiento);

            const oMoveTypeInput = this.getView().byId("moveTypeManual");
            if (oMoveTypeInput) oMoveTypeInput.setValue(sClaseMovimiento);

            const oRefDocNoInput = this.getView().byId("refDocNo");
            if (oRefDocNoInput) oRefDocNoInput.setValue("");

            this._resetCurrentItem();
            this._updatePositionFields();
            this._applyDisplayConfiguration();
        },

        /***
         *
         * Actualiza la visibilidad de los campos de posición (centro de costo, motivo)
         * según el tipo de movimiento seleccionado.
         */

        /***
 * 
 * Actualiza la visibilidad de los campos de posición (centro de costo, motivo)
 * según el tipo de movimiento seleccionado.
 */
        _updatePositionFields: function () {
            const oModel = this.getView().getModel("mainModel");
            const sMoveType = oModel.getProperty("/savedHeader/move_type") || oModel.getProperty("/header/move_type") || "";
            const oView = this.getView();

            const oCostcenter = oView.byId("costcenter");
            const oMoveReas = oView.byId("moveReas");

            if (oCostcenter) oCostcenter.setVisible(sMoveType === "201" || sMoveType === "551");
            if (oMoveReas) oMoveReas.setVisible(true); // Cambiado de sMoveType === "551" a true para que siempre sea visible en desguace

            this._updateBatchField();
        },


        /***
         *
         * Valida los campos obligatorios de la cabecera antes de pasar a la pestaña Posición.
         * @returns {boolean} True si los campos son válidos, false si no.
         */
        validateHeaderFields: function () {
            const oModel = this.getView().getModel("mainModel");
            const oHeader = oModel.getProperty("/header");

            if (!oHeader.move_type) {
                this.showMessage("Selecciona una operación de almacén");
                return false;
            }
            if (!oHeader.doc_date || !this._isValidDate(oHeader.doc_date)) {
                this.showMessage("Ingresa una fecha de documento válida");
                return false;
            }
            if (!oHeader.pstng_date || !this._isValidDate(oHeader.pstng_date)) {
                this.showMessage("Ingresa una fecha de contabilización válida");
                return false;
            }
            if (!oHeader.header_txt) {
                this.showMessage("Ingresa un texto de cabecera");
                return false;
            }
            if ((oHeader.move_type === "201" || oHeader.move_type === "261") && !oHeader.ref_doc_no) {
                this.showMessage("Ingresa el documento de referencia");
                return false;
            }
            return true;
        },

        /***
         *
         * Valida y guarda los datos de la cabecera, carga ítems relacionados con la
         *  referencia ingresada y abre el diálogo de selección de ítems.
         *
         */
        onContinueHeader: async function () {
            this.getView().setBusy(true);

            if (!this.validateHeaderFields()) {
                this.getView().setBusy(false);
                return;
            }

            const oModel = this.getView().getModel("mainModel");
            const sReference = oModel.getProperty("/header/ref_doc_no");
            if (!sReference) {
                this.onNavToIconTabBar("Cabecera");
                this.showMessage("Ingresa un documento de referencia");
                this.getView().setBusy(false);
                return;
            }

            oModel.setProperty("/savedHeader", {
                ...oModel.getProperty("/header"),
                movementDescription: `${oModel.getProperty("/header/move_type")} - ${oModel.getProperty("/header/reference_type")}`
            });
            oModel.setProperty("/header", this._getDefaultHeader());

            try {
                const aMockItems = oModel.getProperty("/config/productionOrderComponents") || [];
                let oRefItems = aMockItems.filter(item => item.ProductionOrder === sReference);

                if (!oRefItems.length) {
                    throw new Error("No hay ítems para la referencia " + sReference);
                }

                const oItems = oRefItems.map(element => {
                    const oCantDisponible = parseFloat(element.RequiredQuantity) - parseFloat(element.WithdrawnQuantity);
                    return {
                        material: element.Material,
                        txt_material: element.MaterialDescription,
                        cantidad: oCantDisponible.toFixed(3),
                        um: element.BaseUnitSAPCode,
                        centro: element.Plant,
                        almacen: element.StorageLocation,
                        isBatchRequired_txt: element.IsBatchManagementRequired ? "Sí" : "No",
                        GoodsMovementType: element.GoodsMovementType,
                        isBatchRequired: !!element.IsBatchManagementRequired
                    };
                });

                oModel.setProperty("/ReferenceItems", oItems);

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

        /***
         *
         * Procesa un ítem seleccionado desde el diálogo de ítems, actualiza el modelo
         *              currentItem con los datos seleccionados y navega a la pestaña Posición.
         * @param {sap.ui.base.Event} oEvent - Evento del botón de selección.
         */
        onProcesarItem: function (oEvent) {
            const oItem = oEvent.getSource().getBindingContext("mainModel")?.getObject();
            if (!oItem) {
                MessageBox.error("Error: No se pudo obtener el ítem seleccionado");
                return;
            }
            const oModel = this.getView().getModel("mainModel");

            const aItems = oModel.getProperty("/items") || [];
            const aPositionTexts = aItems
                .filter(item => item.material === oItem.material && item.position_txt)
                .map(item => item.position_txt);
            const sPositionTxtHistory = aPositionTexts.length > 0
                ? aPositionTexts.join("\n")
                : "No hay historial de texto para este material";

            oModel.setProperty("/currentItem", {
                material: oItem.material,
                materialDescription: oItem.txt_material,
                entry_qnt: oItem.cantidad,
                entry_uom: oItem.um,
                batch: oItem.isBatchRequired ? "" : "",
                plant: oItem.centro,
                stge_loc: oItem.almacen,
                costcenter: "",
                move_reas: "",
                position_txt: "",
                position_txt_history: sPositionTxtHistory,
                isBatchRequired: oItem.isBatchRequired,
                materialState: "Success",
                materialStateText: ""
            });

            if (this.oItemsDialog) {
                this.oItemsDialog.close();
            }

            this.onNavToIconTabBar("Posicion");
            this._updatePositionFields();
        },

        /***
         *
         * Cierra el diálogo de selección de ítems.
         */
        onCloseItemsDialog: function () {
            if (this.oItemsDialog) {
                this.oItemsDialog.close();
            }
        },

        /***
         *
         * Navega a la pestaña especificada por su clave (Cabecera, Posicion, OrdenCompleta).
         * @param {string} sKey - Clave de la pestaña.
         */
        onNavToIconTabBar: function (sKey) {
            const oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) {
                oTabBar.setSelectedKey(sKey);
            }
        },

        /***
         * 
         * @description Valida que la cabecera esté completa antes de permitir la navegación a la pestaña Posición.
         * @param {sap.ui.base.Event} oEvent - Evento de cambio de pestaña.
         */
        onTabSelect: function (oEvent) {
            const sKey = oEvent.getParameter("key");
            if (sKey === "Posicion" && !this.getView().getModel("mainModel").getProperty("/savedHeader/move_type")) {
                this.showMessage("Primero completa la cabecera");
                this.onNavToIconTabBar("Cabecera");
            }
        },

        /***
         * 
         * Valida los campos obligatorios de un ítem antes de guardarlo.
         * @param {Object} oItem - Objeto del ítem a validar.
         * @param {string} sMoveType - Tipo de movimiento.
         * @returns {boolean} True si el ítem es válido, false si no.
         */
        _validateItem: function (oItem, sMoveType) {
            if (!oItem.material || !oItem.entry_qnt || !oItem.entry_uom || !oItem.plant || !oItem.stge_loc) {
                this.showMessage("Completa los campos obligatorios: Material, Cantidad, UM, Centro, Almacén");
                return false;
            }
            if ((sMoveType === "201" || sMoveType === "551") && !oItem.costcenter?.trim()) {
                this.showMessage("El campo Centro de Costo es obligatorio para este tipo de movimiento");
                return false;
            }
            if (sMoveType === "551" && !oItem.move_reas?.trim()) {
                this.showMessage("El campo Motivo es obligatorio");
                return false;
            }
            if (oItem.isBatchRequired && !oItem.batch?.trim()) {
                this.showMessage("El campo Lote es obligatorio para este material");
                return false;
            }
            const oUOM = this.getView().getModel("mainModel").getProperty("/config/unitOfMeasureISO");
            if (!oUOM[oItem.entry_uom]) {
                this.showMessage("Unidad de medida no válida");
                return false;
            }
            return true;
        },

        /***
         * Restablece los valores del ítem actual a su estado inicial.
         */
        _resetCurrentItem: function () {
            const oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/currentItem", {
                material: "",
                materialDescription: "",
                entry_qnt: "",
                entry_uom: "",
                batch: "",
                plant: "",
                stge_loc: "",
                costcenter: "",
                move_reas: "",
                position_txt: "",
                position_txt_history: "",
                isBatchRequired: false,
                materialState: "None",
                materialStateText: ""
            });
        },

        /***
         *
         * Guarda un ítem validado en la lista de ítems, actualiza el contador
         *   y navega a la pestaña Orden Completa.
         */
        onSaveItem: function () {
            const oModel = this.getView().getModel("mainModel");
            const oCurrentItem = oModel.getProperty("/currentItem");
            const oHeader = oModel.getProperty("/savedHeader");

            if (!this._validateItem(oCurrentItem, oHeader.move_type)) return;

            const oUOM = oModel.getProperty("/config/unitOfMeasureISO");
            if (!oUOM[oCurrentItem.entry_uom]) {
                this.showMessage("Unidad de medida no válida");
                return;
            }

            const aMaterialInfo = oModel.getProperty("/config/materialInfo") || [];
            const oMaterial = aMaterialInfo.find(info => info.Material === oCurrentItem.material);
            const sMaterialDescription = oMaterial ? oMaterial.MaterialDescription : "Desconocido";

            const aItems = oModel.getProperty("/items") || [];
            const sDocNumber = `DOC${Date.now()}-${aItems.length + 1}`;

            const oNewItem = {
                ...oCurrentItem,
                orderpr_un_iso: oUOM[oCurrentItem.entry_uom],
                materialDescription: sMaterialDescription,
                docNumber: sDocNumber,
                move_type: oHeader.move_type,
                reference_type: oHeader.reference_type,
                movementDescription: `${oHeader.move_type} - ${oHeader.reference_type}`
            };

            aItems.push(oNewItem);
            oModel.setProperty("/items", aItems);
            oModel.setProperty("/itemCount", aItems.length);

            const oTable = this.getView().byId("itemsTable");
            if (oTable) {
                oTable.getBinding("items").refresh();
            }

            this._resetCurrentItem();
            this.showMessage("Ítem guardado");

            this.onNavToIconTabBar("OrdenCompleta");
        },

        /***
         *
         * Cancela la entrada de un ítem, restablece el ítem actual y enfoca el campo de material.
         */
        onCancelItem: function () {
            this._resetCurrentItem();
            this.showMessage("Entrada cancelada");
            const oMaterialInput = this.getView().byId("material");
            if (oMaterialInput) {
                setTimeout(() => oMaterialInput.focus(), 100);
            }
        },

        /***
         * Cancela la entrada de la cabecera y restablece sus valores por defecto.
         */
        onCancelHeader: function () {
            const oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/header", this._getDefaultHeader());
            this.showMessage("Entrada de cabecera cancelada");
        },

        /***
         *  Devuelve un objeto con los valores por defecto para la cabecera.
         * @returns {Object} Objeto con valores iniciales de la cabecera.
         */
        _getDefaultHeader: function () {
            return {
                pstng_date: new Date().toISOString().split("T")[0],
                doc_date: new Date().toISOString().split("T")[0],
                ref_doc_no: "",
                header_txt: "",
                move_type: "",
                reference_type: ""
            };
        },

        /***
         * Navega a la pestaña Cabecera para agregar un nuevo componente.
         */
        onAddComponent: function () {
            this.onNavToIconTabBar("Cabecera");
            this.showMessage("Redirigiendo a la pestaña Cabecera para agregar un nuevo componente");
        },

        /***
         *Reinicia el proceso, limpiando los datos de cabecera, ítems y contador.
         */
        onResetProcess: function () {
            const oModel = this.getView().getModel("mainModel");
            oModel.setProperty("/savedHeader", {});
            oModel.setProperty("/items", []);
            oModel.setProperty("/itemCount", 0);
            oModel.setProperty("/ReferenceItems", []);
            oModel.setProperty("/header", this._getDefaultHeader());
            this.onNavToIconTabBar("Cabecera");
            this.showMessage("Proceso reiniciado");
        },

        /***
         * Abre el diálogo de ayuda para seleccionar un motivo de movimiento.
         * @param {sap.ui.base.Event} oEvent - Evento del campo de motivo.
         */
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

        /***
         *  Enlaza los datos del diálogo de motivos al modelo mainModel.
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

        /***
         *  Actualiza el campo de motivo con el valor seleccionado y cierra el diálogo.
         * @param {sap.ui.base.Event} oEvent - Evento de confirmación del diálogo.
         */
        onMoveReasConfirm: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oInput = this.getView().byId("moveReas");
                if (oInput) {
                    oInput.setValue(oSelectedItem.getTitle());
                    this.getView().getModel("mainModel").setProperty("/currentItem/move_reas", oSelectedItem.getKey());
                }
                this._oValueHelpDialog.close();
            }
        },

        /***
         *  Filtra los motivos en el diálogo según el texto ingresado.
         * @param {sap.ui.base.Event} oEvent - Evento de búsqueda en el diálogo.
         */
        onMoveReasSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oFilter = new Filter("text", FilterOperator.Contains, sValue);
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        /***
         * Simula la creación de una orden, validando que existan ítems y fechas válidas.
         */
        onSubmit: function () {
            const oModel = this.getView().getModel("mainModel");
            const oHeader = oModel.getProperty("/savedHeader");
            const aItems = oModel.getProperty("/items");

            if (!aItems.length) {
                this.showMessage("Agrega al menos un ítem");
                return;
            }

            if (!this._isValidDate(oHeader.doc_date) || !this._isValidDate(oHeader.pstng_date)) {
                this.showMessage("Fechas inválidas en la cabecera");
                return;
            }

            this.showMessage(`Orden simulada creada con éxito. Documento: DOC${Date.now()}`);
            oModel.setProperty("/items", []);
            oModel.setProperty("/itemCount", 0);
            oModel.setProperty("/savedHeader", {});
            oModel.setProperty("/ReferenceItems", []);
            this.onNavToIconTabBar("Cabecera");
        },

        /***
         *  Verifica si una fecha es válida.
         * @param {string} sDate - Fecha en formato string.
         * @returns {boolean} True si la fecha es válida, false si no.
         */
        _isValidDate: function (sDate) {
            return sDate && !isNaN(new Date(sDate).getTime());
        },

        /***
         *Elimina un ítem de la lista, actualiza el contador y refresca la tabla.
         * @param {sap.ui.base.Event} oEvent - Evento del botón de eliminación.
         */
        onDeleteItem: function (oEvent) {
            const oItem = oEvent.getSource().getParent();
            const oBinding = oItem.getBindingContext("mainModel");
            const oModel = this.getView().getModel("mainModel");
            const aItems = oModel.getProperty("/items");

            if (oBinding && oBinding.getPath()) {
                const index = parseInt(oBinding.getPath().split("/").pop(), 10);
                if (index >= 0 && index < aItems.length) {
                    aItems.splice(index, 1);
                    oModel.setProperty("/items", aItems);
                    oModel.setProperty("/itemCount", aItems.length);
                    const oTable = this.getView().byId("itemsTable");
                    if (oTable) {
                        oTable.getBinding("items").refresh();
                        this.showMessage("Ítem eliminado");
                    } else {
                        MessageBox.error("Error: Tabla no encontrada");
                    }
                } else {
                    MessageBox.error("Error: Índice inválido");
                }
            } else {
                MessageBox.error("Error: No se pudo determinar el ítem a eliminar");
            }
        },

        /***
 * @method onMaterialScanned
 * @description Valida y procesa el código de barras escaneado, actualiza el modelo
 *              currentItem con los datos del material, verifica el stock disponible
 *              y muestra el estado de validación.
 * @param {sap.ui.base.Event} oEvent - Evento con el valor escaneado.
 */
        onMaterialScanned: function (oEvent) {
            const sScannedValue = oEvent.getParameter("value")?.trim();
            const oModel = this.getView().getModel("mainModel");
            const oMaterialInput = this.getView().byId("material");

            /*** Validar que el código escaneado no esté vacío */
            if (!sScannedValue) {
                oModel.setProperty("/currentItem/materialState", "Error");
                oModel.setProperty("/currentItem/materialStateText", "Código de material inválido");
                this.showMessage("Código de material inválido");
                return;
            }

            /*** Buscar el material en los datos mock de componentes de órdenes de producción */
            const aProductionOrderComponents = oModel.getProperty("/config/productionOrderComponents") || [];
            const oMatchedMaterial = aProductionOrderComponents.find(item => item.Material === sScannedValue);

            if (oMatchedMaterial) {
                /*** Verificar el stock disponible para el material */
                const fRequired = parseFloat(oMatchedMaterial.RequiredQuantity) || 0;
                const fWithdrawn = parseFloat(oMatchedMaterial.WithdrawnQuantity) || 0;
                const fAvailableQuantity = fRequired - fWithdrawn;
                if (fAvailableQuantity <= 0) {
                    oModel.setProperty("/currentItem/materialState", "Error");
                    oModel.setProperty("/currentItem/materialStateText", "Sin stock disponible");
                    this.showMessage("Sin stock disponible para el material");
                    return;
                }

                /*** Actualizar currentItem con los datos del material y la cantidad disponible */
                oModel.setProperty("/currentItem", {
                    ...oModel.getProperty("/currentItem"),
                    material: oMatchedMaterial.Material,
                    materialDescription: oMatchedMaterial.MaterialDescription,
                    entry_qnt: fAvailableQuantity.toFixed(3), // Establecer la cantidad disponible
                    entry_uom: oMatchedMaterial.BaseUnitSAPCode,
                    plant: oMatchedMaterial.Plant,
                    stge_loc: oMatchedMaterial.StorageLocation,
                    isBatchRequired: !!oMatchedMaterial.IsBatchManagementRequired,
                    materialState: "Success",
                    materialStateText: "",
                    quantityState: "Success", // Estado de validación para entry_qnt
                    quantityStateText: "" // Texto de error para entry_qnt
                });
                this.showMessage(`Material válido: ${sScannedValue} (Stock disponible: ${fAvailableQuantity.toFixed(3)})`);
            } else {
                /*** Manejar caso de material no encontrado */
                oModel.setProperty("/currentItem/material", sScannedValue);
                oModel.setProperty("/currentItem/materialState", "Error");
                oModel.setProperty("/currentItem/materialStateText", "Material no encontrado");
                this.showMessage("Material no encontrado");
            }

            /*** Actualizar historial de texto de posición y campo de lote */
            this._updatePositionTextHistory(sScannedValue);
            this._updateBatchField();

            /*** Mantener el foco en el campo de material para escaneos continuos */
            if (oMaterialInput) {
                setTimeout(() => oMaterialInput.focus(), 100);
            }
        },

        /***
         * @method onQuantityChange
         * @description Valida la cantidad ingresada en el campo entry_qnt, asegurando que sea mayor que 0
         *              y no exceda el stock disponible del material seleccionado.
         * @param {sap.ui.base.Event} oEvent - Evento de cambio en el campo de cantidad.
         */
        onQuantityChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const fValue = parseFloat(oInput.getValue());
            const oModel = this.getView().getModel("mainModel");
            const sMaterial = oModel.getProperty("/currentItem/material");
            const aProductionOrderComponents = oModel.getProperty("/config/productionOrderComponents") || [];
            const oMatchedMaterial = aProductionOrderComponents.find(item => item.Material === sMaterial);

            if (!sMaterial || !oMatchedMaterial) {
                oInput.setValueState("Error").setValueStateText("Material no seleccionado o inválido");
                oModel.setProperty("/currentItem/quantityState", "Error");
                oModel.setProperty("/currentItem/quantityStateText", "Material no seleccionado o inválido");
                this.showMessage("Selecciona un material válido primero");
                return;
            }

            const fRequired = parseFloat(oMatchedMaterial.RequiredQuantity) || 0;
            const fWithdrawn = parseFloat(oMatchedMaterial.WithdrawnQuantity) || 0;
            const fAvailableQuantity = fRequired - fWithdrawn;

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
        },

        /***
         * @method onSaveItem
         * @description Guarda un ítem validado en la lista de ítems, actualiza el contador
         *              y navega a la pestaña Orden Completa, verificando el stock disponible.
         */
        onSaveItem: function () {
            const oModel = this.getView().getModel("mainModel");
            const oCurrentItem = oModel.getProperty("/currentItem");
            const oHeader = oModel.getProperty("/savedHeader");

            /*** Validar campos obligatorios del ítem */
            if (!this._validateItem(oCurrentItem, oHeader.move_type)) return;

            /*** Validar unidad de medida */
            const oUOM = oModel.getProperty("/config/unitOfMeasureISO");
            if (!oUOM[oCurrentItem.entry_uom]) {
                this.showMessage("Unidad de medida no válida");
                return;
            }

            /*** Validar stock disponible */
            const aProductionOrderComponents = oModel.getProperty("/config/productionOrderComponents") || [];
            const oMatchedMaterial = aProductionOrderComponents.find(item => item.Material === oCurrentItem.material);
            if (oMatchedMaterial) {
                const fRequired = parseFloat(oMatchedMaterial.RequiredQuantity) || 0;
                const fWithdrawn = parseFloat(oMatchedMaterial.WithdrawnQuantity) || 0;
                const fAvailableQuantity = fRequired - fWithdrawn;
                const fEnteredQuantity = parseFloat(oCurrentItem.entry_qnt) || 0;
                if (fEnteredQuantity > fAvailableQuantity) {
                    oModel.setProperty("/currentItem/quantityState", "Error");
                    oModel.setProperty("/currentItem/quantityStateText", `La cantidad no puede exceder el stock disponible (${fAvailableQuantity.toFixed(3)})`);
                    this.showMessage(`La cantidad no puede exceder el stock disponible (${fAvailableQuantity.toFixed(3)})`);
                    return;
                }
            } else {
                this.showMessage("Material no encontrado en los datos de stock");
                return;
            }

            /*** Obtener descripción del material */
            const aMaterialInfo = oModel.getProperty("/config/materialInfo") || [];
            const oMaterial = aMaterialInfo.find(info => info.Material === oCurrentItem.material);
            const sMaterialDescription = oMaterial ? oMaterial.MaterialDescription : "Desconocido";

            /*** Crear nuevo ítem y añadirlo a la lista */
            const aItems = oModel.getProperty("/items") || [];
            const sDocNumber = `DOC${Date.now()}-${aItems.length + 1}`;

            const oNewItem = {
                ...oCurrentItem,
                orderpr_un_iso: oUOM[oCurrentItem.entry_uom],
                materialDescription: sMaterialDescription,
                docNumber: sDocNumber,
                move_type: oHeader.move_type,
                reference_type: oHeader.reference_type,
                movementDescription: `${oHeader.move_type} - ${oHeader.reference_type}`
            };

            aItems.push(oNewItem);
            oModel.setProperty("/items", aItems);
            oModel.setProperty("/itemCount", aItems.length);

            /*** Refrescar la tabla de ítems */
            const oTable = this.getView().byId("itemsTable");
            if (oTable) {
                oTable.getBinding("items").refresh();
            }

            /*** Restablecer el ítem actual y navegar a Orden Completa */
            this._resetCurrentItem();
            this.showMessage("Ítem guardado");

            this.onNavToIconTabBar("OrdenCompleta");
        },

        /***
         *  Abre el diálogo de selección de ítems para elegir un material manualmente.
         * @param {sap.ui.base.Event} oEvent - Evento del campo de material.
         */
        onMaterialValueHelp: function (oEvent) {
            if (!this.oItemsDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "logaligroup.mapeobapi.fragments.ItemsDialog",
                    controller: this
                }).then(oDialog => {
                    this.oItemsDialog = oDialog;
                    this.getView().addDependent(this.oItemsDialog);
                    this.oItemsDialog.open();
                }).catch(error => {
                    MessageBox.error("Error al cargar el diálogo de ítems: " + error.message);
                });
            } else {
                this.oItemsDialog.open();
            }
        },

        /***
         *Valida el código de material escaneado y actualiza el historial de texto.
         * @param {string} sMaterial - Código del material.
         */
        _validateMaterial: function (sMaterial) {
            if (sMaterial) {
                const oModel = this.getView().getModel("mainModel");
                const aProductionOrderComponents = oModel.getProperty("/config/productionOrderComponents") || [];
                const oMatchedMaterial = aProductionOrderComponents.find(item => item.Material === sMaterial);

                if (oMatchedMaterial) {
                    oModel.setProperty("/currentItem/materialState", "Success");
                    oModel.setProperty("/currentItem/materialStateText", "");
                    this.showMessage(`Material escaneado: ${sMaterial}`);
                } else {
                    oModel.setProperty("/currentItem/materialState", "Error");
                    oModel.setProperty("/currentItem/materialStateText", "Material no encontrado");
                    this.showMessage("Material no encontrado");
                }
                this._updatePositionTextHistory(sMaterial);
            } else {
                this.showMessage("Código de material inválido");
            }
        },

        /***
         *  Actualiza el historial de texto de posición para un material específico.
         * @param {string} sMaterial - Código del material.
         */
        _updatePositionTextHistory: function (sMaterial) {
            const oModel = this.getView().getModel("mainModel");
            const aItems = oModel.getProperty("/items") || [];
            const aPositionTexts = aItems
                .filter(item => item.material === sMaterial && item.position_txt)
                .map(item => item.position_txt);
            const sPositionTxtHistory = aPositionTexts.length > 0
                ? aPositionTexts.join("\n")
                : "No hay historial de texto para este material";
            oModel.setProperty("/currentItem/position_txt_history", sPositionTxtHistory);
        },

        /***
         *Simula el registro de un movimiento de mercancía, validando campos obligatorios.
         */
        onPostMovement: function () {
            const oModel = this.getView().getModel("mainModel");
            const oHeader = oModel.getProperty("/savedHeader");
            const oItem = oModel.getProperty("/currentItem");

            if (!oHeader.move_type || !oItem.material || !oItem.entry_qnt) {
                MessageBox.error("Por favor, completa los campos obligatorios: Tipo de movimiento, Material y Cantidad");
                return;
            }

            MessageBox.success("Movimiento de mercancía simulado registrado exitosamente.");
            this._resetCurrentItem();
        },

        /***
         * Carga detalles de un material desde los datos mock y actualiza el ítem actual.
         * @async
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
                const aMaterialDetails = oModel.getProperty("/config/materialDetails") || [];
                const oDetails = aMaterialDetails.find(detail => detail.Material === sMaterial);
                if (oDetails) {
                    const aMaterialInfo = oModel.getProperty("/config/materialInfo") || [];
                    const oMaterial = aMaterialInfo.find(info => info.Material === sMaterial);
                    oModel.setProperty("/currentItem", {
                        ...oModel.getProperty("/currentItem"),
                        batch: oDetails.Batch || "",
                        plant: oDetails.Plant || "",
                        stge_loc: oDetails.StorageLocation || "",
                        materialDescription: oMaterial ? oMaterial.MaterialDescription : "Desconocido",
                        isBatchRequired: oMaterial ? oMaterial.IsBatchManagementRequired : false,
                        materialState: "Success",
                        materialStateText: ""
                    });
                    this._updatePositionTextHistory(sMaterial);
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
        /***
         *  Valida la cantidad ingresada en el campo entry_qnt para asegurar que sea mayor que 0.
         * @param {sap.ui.base.Event} oEvent - Evento de cambio en el campo de cantidad.
         */
        onQuantityChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var fValue = parseFloat(oInput.getValue());
            if (fValue <= 0) {
                oInput.setValueState("Error").setValueStateText("La cantidad debe ser mayor que 0");
            } else {
                oInput.setValueState("None");
            }
        },

        /***
         *  Muestra un mensaje al usuario usando MessageToast.
         * @param {string} sMessage - Mensaje a mostrar.
         */
        showMessage: function (sMessage) {
            MessageToast.show(sMessage, { duration: 3000 });
        }
    });
});