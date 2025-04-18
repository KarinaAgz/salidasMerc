sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";

    return UIComponent.extend("logaligroup.mapeobapi.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            // Llamar al método init del padre
            UIComponent.prototype.init.apply(this, arguments);

            // Inicializar el modelo mainModel con datos por defecto
            var oMainModel = new JSONModel({
                header: {
                    reference_type: "",
                    reserv_no: "",
                    res_item: "",
                    orderid: "",
                    move_type: "",
                    pstng_date: "",
                    doc_date: "",
                    ref_doc_no: "",
                    header_txt: "",
                    ver_gr_gi_slip: "",
                    ver_gr_gi_slipx: ""
                },
                currentItem: {
                    material: "",
                    plant: "",
                    stge_loc: "",
                    batch: "",
                    entry_qnt: "",
                    entry_uom: "",
                    costcenter: "",
                    orderid: "",
                    move_reas: ""
                },
                items: [],
                code: {
                    gm_code: "03"
                }
            });
            this.setModel(oMainModel, "mainModel");
            console.log("Modelo mainModel inicializado en Component.js");

            // Inicializar el router
            this.getRouter().initialize();
        }
    });
});