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
            console.log("Component.js: Iniciando inicialización...");
            // Llamar al método init de la clase padre
            UIComponent.prototype.init.apply(this, arguments);

            // Inicializar el modelo mainModel
            var oMainModel = this.getModel("mainModel");
            if (!oMainModel) {
                console.log("mainModel no encontrado en Component.js, inicializando...");
                oMainModel = new JSONModel({
                    header: {
                        reference_type: "",
                        reserv_no: "",
                        res_item: "",
                        orderid: "",
                        move_type: "",
                        pstng_date: new Date().toISOString().split("T")[0],
                        doc_date: new Date().toISOString().split("T")[0],
                        ref_doc_no: "",
                        header_txt: "",
                        ver_gr_gi_slip: "3",
                        ver_gr_gi_slipx: "X"
                    },
                    code: {
                        gm_code: "03"
                    },
                    items: [],
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
                    motivos: [
                        { key: "", text: "Seleccionar..." },
                        { key: "0001", text: "Obsolescencia" },
                        { key: "0002", text: "Defectuoso" },
                        { key: "0003", text: "Fin de Vida" },
                        { key: "0004", text: "Otros Motivos" }
                    ]
                });
                oMainModel.setDefaultBindingMode("TwoWay");
                this.setModel(oMainModel, "mainModel");
            }
            console.log("mainModel inicializado en Component.js:", oMainModel.getData());

            // Inicializar el router
            this.getRouter().initialize();
            console.log("Component.js: Inicialización completada");
        }
    });
});