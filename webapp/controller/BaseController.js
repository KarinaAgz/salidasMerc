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
            // Iterar sobre configuraciones de modelos JSON
            Object.keys(oJSONModels).forEach(sModelName => {
                // Crear modelo JSON con datos iniciales
                const oModel = new JSONModel(oJSONModels[sModelName]);
                // Asignar modelo a la vista
                oView.setModel(oModel, sModelName);
            });
        },

        /**
         * Lee datos de un servicio OData y devuelve una promesa con los resultados
         * @param {string} sModelName - Nombre del modelo OData
         * @param {string} sEntitySet - Conjunto de entidades OData
         * @param {sap.ui.model.Filter[]} [aFilters=[]] - Filtros opcionales para la consulta
         * @param {Object} [oUrlParameters={}] - Parámetros URL adicionales
         * @returns {Promise<Object>} Promesa con los resultados de la consulta
         */
        readOData: async function (sModelName, sEntitySet, aFilters = [], oUrlParameters = {}) {
            const oModel = this.getView().getModel(sModelName); // Obtener modelo OData
            return new Promise((resolve, reject) => {
                // Ejecutar consulta OData
                oModel.read(`/${sEntitySet}`, {
                    filters: aFilters, // Aplicar filtros
                    urlParameters: oUrlParameters, // Parámetros adicionales
                    success: function (oData) {
                        // Resolver con resultados (lista o entidad única)
                        resolve(oData.results || oData);
                    },
                    error: function (oError) {
                        // Rechazar con error
                        reject(oError);
                    }
                });
            });
        },

        /**
         * Obtiene el token CSRF para operaciones seguras en OData
         * @param {string} sModelName - Nombre del modelo OData
         * @returns {Promise<string>} Promesa con el token CSRF
         */
        fetchCsrfToken: async function (sModelName) {
            const oModel = this.getView().getModel(sModelName); // Obtener modelo
            return new Promise((resolve, reject) => {
                // Refrescar token CSRF
                oModel.refreshSecurityToken(
                    () => resolve(oModel.getSecurityToken()), // Resolver con el token
                    reject // Rechazar en caso de error
                );
            });
        },

        /**
         * Aplica la configuración de visualización a controles UI
         * @param {Object[]} aControls - Lista de controles con {id, key}
         * @param {string} sConfigPath - Ruta en el modelo de configuración 
         */
        applyDisplayConfiguration: function (aControls, sConfigPath) {
            const oDisplayModel = this.getView().getModel("oDisplayModel").getData(); // Obtener datos de configuración
            const oView = this.getView(); // Obtener vista

            // Iterar sobre controles
            aControls.forEach(({ id, key }) => {
                const oControl = oView.byId(id); // Obtener control por ID
                if (oControl && oDisplayModel[sConfigPath]?.[key] !== undefined) {
                    // Establecer visibilidad según configuración
                    oControl.setVisible(oDisplayModel[sConfigPath][key]);
                    // Obtener contenedor padre
                    const oParent = oControl.getParent();
                    // Obtener etiqueta asociada (si existe)
                    const oLabel = oParent.getLabel && oParent.getLabel();
                    if (oLabel) oLabel.setVisible(oDisplayModel[sConfigPath][key]); // Aplicar visibilidad a la etiqueta
                }
            });
        },

        /**
         * Navega a una pestaña específica en un IconTabBar
         * @param {string} sKey - Clave de la pestaña
         */
        navigateToTab: function (sKey) {
            const oTabBar = this.getView().byId("mainTabBar"); // Obtener IconTabBar
            if (oTabBar) {
                // Seleccionar pestaña por clave
                oTabBar.setSelectedKey(sKey);
            }
        },

        /**
         * Valida campos obligatorios de un formulario
         */
        validateFields: function (aFields, sModelPath, oDisplayConfig) {
            const oModel = this.getView().getModel("mainModel"); // Obtener modelo principal
            const oBundle = this.getResourceBundle(); // Obtener ResourceBundle para i18n
            let bValid = true; // Indicador de validez
            const aMissingFields = []; // Lista de campos faltantes

            // Iterar sobre campos
            aFields.forEach(oField => {
                const oControl = this.getView().byId(oField.id); // Obtener control
                const sValue = oModel.getProperty(`${sModelPath}/${oField.prop}`); // Obtener valor
                // Verificar si el campo está vacío
                let bIsEmpty = !sValue || sValue.trim() === "" || (oField.id === "referenceType" && sValue === "0");

                // Excluir refDocNo si no es requerido
                if (oField.id === "refDocNo" && !oDisplayConfig.referencia) {
                    bIsEmpty = false;
                }

                if (bIsEmpty) {
                    bValid = false; // Marcar como inválido
                    aMissingFields.push(oField.label); // Añadir campo faltante
                    // Establecer estado de error en el control
                    oControl.setValueState("Error");
                    oControl.setValueStateText(oBundle.getText("validation.fieldRequired", [oField.label]));
                } else {
                    // Limpiar estado de error
                    oControl.setValueState("None");
                }
            });

            if (!bValid) {
                // Mostrar mensaje de campos faltantes
                this.showErrorMessage(oBundle.getText("validation.missingFields", [aMissingFields.join(", ")]));
            }

            return bValid;
        },

        /**
         * Muestra un mensaje de error usando MessageBox
         */
        showErrorMessage: function (sMessage) {
            // Mostrar mensaje modal de error
            MessageBox.error(sMessage);
        },

        /**
         * Muestra un mensaje temporal usando MessageToast - Duración en milisegundos
         */
        showMessage: function (sMessage, iDuration = 3000) {
            // Mostrar mensaje temporal
            MessageToast.show(sMessage, { duration: iDuration });
        },

        /**
         * Carga un fragmento de diálogo y lo almacena en una propiedad
         */
        loadFragmentDialog: async function (sFragmentName, sDialogProperty) {
            if (!this[sDialogProperty]) {
                // Cargar fragmento si no existe
                this[sDialogProperty] = await Fragment.load({
                    id: this.getView().getId(), // Usar ID de la vista
                    name: sFragmentName, // Nombre del fragmento
                    controller: this // Asignar controlador
                });
                // Añadir como dependiente de la vista
                this.getView().addDependent(this[sDialogProperty]);
            }
            return this[sDialogProperty];
        },

        /**
         * Cierra un diálogo almacenado en una propiedad
         */
        closeDialog: function (sDialogProperty) {
            if (this[sDialogProperty]) {
                // Cerrar diálogo si existe
                this[sDialogProperty].close();
            }
        },

        /**
         * Obtiene el ResourceBundle para textos traducibles
         * @returns {sap.ui.model.resource.ResourceModel} ResourceBundle
         */
        getResourceBundle: function () {
            // Obtener modelo i18n del componente
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**
         * Actualiza el estado del campo de lote según isBatchRequired
         */
        updateBatchField: function () {
            const oModel = this.getView().getModel("mainModel"); // Obtener modelo
            const bIsBatchRequired = oModel.getProperty("/currentItem/isBatchRequired"); // Verificar si lote es requerido
            const oBatchInput = this.getView().byId("batch"); // Obtener campo de lote
            if (oBatchInput) {
                // Habilitar/deshabilitar campo según configuración
                oBatchInput.setEnabled(bIsBatchRequired);
                if (!bIsBatchRequired) {
                    // Limpiar campo si no es requerido
                    oModel.setProperty("/currentItem/batch", "");
                }
            }
        }
    });
});