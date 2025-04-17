sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "logaligroup/mapeobapi/model/models"
], function (UIComponent, Device, JSONModel, models) {
    "use strict";

    return UIComponent.extend("logaligroup.mapeobapi.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            // Call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // Set the device model
            this.setModel(models.createDeviceModel(), "device");

            // Initialize the mainModel
            var oInitialData = {
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
                }
            };

            var oMainModel = new JSONModel(oInitialData);
            this.setModel(oMainModel, "mainModel");

            // Enable routing
            this.getRouter().initialize();
        }
    });
});