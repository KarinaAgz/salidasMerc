sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "jquery.sap.global"
], function (Controller, ODataModel, JSONModel, Filter, FilterOperator, Fragment, MessageBox, MessageToast, jQuery) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.BaseController", {
        /**
         * Inicializa los modelos OData y JSON comunes
         * @param {Object} oView - Vista del controlador
         * @param {Object} oODataModels - Objeto con configuraciones de modelos OData
         * @param {Object} oJSONModels - Objeto con configuraciones de modelos JSON
         */
        initializeModels: function (oView, oODataModels, oJSONModels) {
            // Configurar modelos OData
            Object.keys(oODataModels).forEach(sModelName => {
                const oModel = new ODataModel(oODataModels[sModelName].url, {
                    json: true,
                    useBatch: true,
                    defaultBindingMode: "TwoWay"
                });
                oView.setModel(oModel, sModelName);
            });

            // Configurar modelos JSON
            Object.keys(oJSONModels).forEach(sModelName => {
                const oModel = new JSONModel(oJSONModels[sModelName]);
                oView.setModel(oModel, sModelName);
            });
        },

        /**
         * Lee datos de un servicio OData
         * @param {String} sModelName - Nombre del modelo OData
         * @param {String} sEntitySet - Conjunto de entidades
         * @param {Array} aFilters - Filtros opcionales
         * @param {Object} oUrlParameters - Parámetros URL opcionales
         * @returns {Promise} Promesa con los resultados
         */
        readOData: async function (sModelName, sEntitySet, aFilters = [], oUrlParameters = {}) {
            const oModel = this.getView().getModel(sModelName);
            return new Promise((resolve, reject) => {
                oModel.read(`/${sEntitySet}`, {
                    filters: aFilters,
                    urlParameters: oUrlParameters,
                    success: function (oData) {
                        resolve(oData.results || oData);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        },

        /**
         * Obtiene el token CSRF para operaciones OData
         * @param {String} sModelName - Nombre del modelo OData
         * @returns {Promise} Promesa con el token CSRF
         */
        fetchCsrfToken: async function (sModelName) {
            const oModel = this.getView().getModel(sModelName);
            return new Promise((resolve, reject) => {
                oModel.refreshSecurityToken(
                    () => resolve(oModel.getSecurityToken()),
                    reject
                );
            });
        },

        /**
         * Carga la configuración de visualización desde un archivo JSON
         * @param {String} sConfigPath - Ruta al archivo de configuración
         * @param {String} sModelName - Nombre del modelo para almacenar la configuración
         * @returns {Promise} Promesa con la configuración cargada
         */
        loadDisplayConfiguration: async function (sConfigPath, sModelName) {
            const oModel = this.getView().getModel(sModelName);
            try {
                const response = await jQuery.ajax({
                    url: sConfigPath,
                    method: "GET",
                    dataType: "json"
                });
                oModel.setData(response);
                this.getView().getModel("mainModel").setProperty("/config/displayConfig", response);
                console.log("Configuración de visualización cargada:", response);
                return response;
            } catch (error) {
                console.error("Error al cargar configuración:", error);
                oModel.setData({});
                this.getView().getModel("mainModel").setProperty("/config/displayConfig", {});
                this.showErrorMessage("Error al cargar configuración de visualización.");
            }
        },

        /**
         * Aplica la configuración de visualización a los controles
         * @param {Array} aControls - Lista de controles con {id, key}
         * @param {String} sConfigPath - Ruta en el modelo de configuración (ej. "/Header")
         */
        applyDisplayConfiguration: function (aControls, sConfigPath) {
            const oDisplayModel = this.getView().getModel("oDisplayModel").getData();
            const oView = this.getView();

            aControls.forEach(({ id, key }) => {
                const oControl = oView.byId(id);
                if (oControl && oDisplayModel[sConfigPath]?.[key] !== undefined) {
                    oControl.setVisible(oDisplayModel[sConfigPath][key]);
                    const oParent = oControl.getParent();
                    const oLabel = oParent.getLabel && oParent.getLabel();
                    if (oLabel) oLabel.setVisible(oDisplayModel[sConfigPath][key]);
                }
            });
        },

        /**
         * Navega a una pestaña específica en el IconTabBar
         * @param {String} sKey - Clave de la pestaña
         */
        navigateToTab: function (sKey) {
            const oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) {
                oTabBar.setSelectedKey(sKey);
            }
        },

        /**
         * Valida campos obligatorios
         * @param {Array} aFields - Lista de campos con {id, prop, label}
         * @param {String} sModelPath - Ruta base del modelo (ej. "/header")
         * @param {Object} oDisplayConfig - Configuración de visualización
         * @returns {Boolean} Verdadero si todos los campos son válidos
         */
        validateFields: function (aFields, sModelPath, oDisplayConfig) {
            const oModel = this.getView().getModel("mainModel");
            const oBundle = this.getResourceBundle();
            let bValid = true;
            const aMissingFields = [];

            aFields.forEach(oField => {
                const oControl = this.getView().byId(oField.id);
                const sValue = oModel.getProperty(`${sModelPath}/${oField.prop}`);
                let bIsEmpty = !sValue || sValue.trim() === "" || (oField.id === "referenceType" && sValue === "0");

                if (oField.id === "refDocNo" && !oDisplayConfig.referencia) {
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
                this.showErrorMessage(oBundle.getText("validation.missingFields", [aMissingFields.join(", ")]));
            }

            return bValid;
        },

        /**
         * Muestra un mensaje de error con MessageBox
         * @param {String} sMessage - Mensaje de error
         */
        showErrorMessage: function (sMessage) {
            MessageBox.error(sMessage);
        },

        /**
         * Muestra un mensaje con MessageToast
         * @param {String} sMessage - Mensaje a mostrar
         * @param {Number} iDuration - Duración en milisegundos (opcional)
         */
        showMessage: function (sMessage, iDuration = 3000) {
            MessageToast.show(sMessage, { duration: iDuration });
        },

        /**
         * Carga un fragmento de diálogo
         * @param {String} sFragmentName - Nombre del fragmento
         * @param {String} sDialogProperty - Propiedad donde almacenar el diálogo
         * @returns {Promise} Promesa con el diálogo cargado
         */
        loadFragmentDialog: async function (sFragmentName, sDialogProperty) {
            if (!this[sDialogProperty]) {
                this[sDialogProperty] = await Fragment.load({
                    id: this.getView().getId(),
                    name: sFragmentName,
                    controller: this
                });
                this.getView().addDependent(this[sDialogProperty]);
            }
            return this[sDialogProperty];
        },

        /**
         * Cierra un diálogo
         * @param {String} sDialogProperty - Propiedad donde está almacenado el diálogo
         */
        closeDialog: function (sDialogProperty) {
            if (this[sDialogProperty]) {
                this[sDialogProperty].close();
            }
        },

        /**
         * Obtiene el ResourceBundle para i18n
         * @returns {Object} ResourceBundle
         */
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**
         * Actualiza el estado del campo de lote según isBatchRequired
         */
        updateBatchField: function () {
            const oModel = this.getView().getModel("mainModel");
            const bIsBatchRequired = oModel.getProperty("/currentItem/isBatchRequired");
            const oBatchInput = this.getView().byId("batch");
            if (oBatchInput) {
                oBatchInput.setEnabled(bIsBatchRequired);
                if (!bIsBatchRequired) {
                    oModel.setProperty("/currentItem/batch", "");
                }
            }
        }
    });
});