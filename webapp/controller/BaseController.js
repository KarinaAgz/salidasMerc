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

        initializeModels: function (oView, oJSONModels) {
            Object.keys(oJSONModels).forEach(sModelName => {
                const oModel = new JSONModel(oJSONModels[sModelName]);
                oView.setModel(oModel, sModelName);
            });
        },

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
         * Obtiene el token CSRF para operaciones seguras en OData
         *
         */
        fetchCsrfToken: async function (sModelName) {
            const oModel = this.getView().getModel(sModelName);
            return new Promise((resolve, reject) => {
                // Refrescar token CSRF
                oModel.refreshSecurityToken(
                    () => resolve(oModel.getSecurityToken()),
                    reject
                );
            });
        },

        /**
         * Aplica la configuración de visualización a controles UI
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
         * Navega a una pestaña específica en un IconTabBar
         * 
         */
        navigateToTab: function (sKey) {
            const oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) {
                oTabBar.setSelectedKey(sKey);
            }
        },

        /**
         * Valida campos obligatorios de un formulario
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
         * Muestra un mensaje de error usando MessageBox
         */
        showErrorMessage: function (sMessage) {
            MessageBox.error(sMessage);
        },

        /**
         * Muestra un mensaje temporal usando MessageToast - Duración en milisegundos
         */
        showMessage: function (sMessage, iDuration = 3000) {
            MessageToast.show(sMessage, { duration: iDuration });
        },

        /**
         * Carga un fragmento de diálogo y lo almacena en una propiedad
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
         * Cierra un diálogo almacenado en una propiedad
         */
        closeDialog: function (sDialogProperty) {
            if (this[sDialogProperty]) {
                this[sDialogProperty].close();
            }
        },

        /**
         * Obtiene el ResourceBundle para textos traducibles
         * 
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