sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat"
], function (Controller, MessageToast, DateFormat) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.BaseController", {
        /**
         * Muestra un mensaje emergente
         * @param {String} sMessage - Mensaje a mostrar
         */
        showMessage: function (sMessage) {
            MessageToast.show(sMessage);
        },

        /**
         * Formatea una fecha al formato yyyy-MMMM-dd
         * @param {String} sDate - Fecha en formato ISO
         * @returns {String} - Fecha formateada
         */
        formatDate: function (sDate) {
            if (!sDate) return "";
            const oDate = new Date(sDate);
            const oDateFormat = DateFormat.getDateInstance({ pattern: "yyyy-MMMM-dd" });
            return oDateFormat.format(oDate);
        },

        /**
         * Lee datos de un servicio OData
         * @param {String} sEntitySet - Entidad OData
         * @param {Array} aFilters - Filtros
         * @param {Function} fnSuccess - Callback de éxito
         * @param {Function} fnError - Callback de error
         */
        readOData: function (sEntitySet, aFilters, fnSuccess, fnError) {
            const oODataModel = this.getOwnerComponent().getModel();
            if (oODataModel) {
                oODataModel.read(sEntitySet, {
                    filters: aFilters || [],
                    success: fnSuccess,
                    error: fnError || (() => this.showMessage(`Error al cargar ${sEntitySet}`))
                });
            } else {
                this.showMessage("Modelo OData no configurado");
            }
        },
        /**
 * Reinicia un modelo JSON a un estado inicial
 * @param {sap.ui.model.json.JSONModel} oModel - Modelo a reiniciar
 * @param {Object} oInitialData - Datos iniciales
 */
        clearModel: function (oModel, oInitialData) {
            oModel.setData(oInitialData);
        }
    });
});