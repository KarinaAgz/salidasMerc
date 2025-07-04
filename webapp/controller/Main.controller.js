sap.ui.define([
    "logaligroup/mapeobapi/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment"
  ], function (BaseController, JSONModel, Filter, FilterOperator, Fragment) {
    "use strict";
  
    return BaseController.extend("logaligroup.mapeobapi.controller.Main", {
      onInit: function () {
        const oModel = new JSONModel({
          header: {
            pstng_date: new Date().toISOString().split("T")[0],
            doc_date: new Date().toISOString().split("T")[0],
            ref_doc_no: "",
            header_txt: "",
            move_type: "",
            reference_type: "",
            ver_gr_gi_slip: "3",
            ver_gr_gi_slipx: "X"
          },
          savedHeader: {},
          currentItem: {
            material: "",
            entry_qnt: "",
            entry_uom: "",
            batch: "",
            plant: "",
            stge_loc: "",
            costcenter: "",
            orderid: "",
            move_reas: "",
            position_txt: "",
            reserv_no: "",
            res_item: ""
          },
          items: [],
          itemCount: 0,
          config: {
            unitOfMeasureISO: {},
            moveReasons: []
          }
        });
        this.getView().setModel(oModel, "mainModel");
  
        const oTabBar = this.getView().byId("mainTabBar");
        if (oTabBar) oTabBar.setSelectedKey("Cabecera");
  
        this._loadUnitOfMeasure();
        this._loadMoveReasons();
      },
  
      _loadUnitOfMeasure: function () {
        const oModel = this.getView().getModel("mainModel");
        const oODataModel = this.getView().getModel("odataModel");
        if (oODataModel) {
          oODataModel.read("/T006Set", {
            success: (oData) => {
              const oUOM = {};
              oData.results.forEach(item => {
                oUOM[item.MEINS] = item.MSEHI;
              });
              oModel.setProperty("/config/unitOfMeasureISO", oUOM);
            },
            error: () => {
              oModel.setProperty("/config/unitOfMeasureISO", {
                "ST": "PCE",
                "KG": "KGM",
                "M": "MTR",
                "L": "LTR"
              });
              this.showMessage("Error al cargar unidades de medida, usando valores por defecto");
            }
          });
        } else {
          oModel.setProperty("/config/unitOfMeasureISO", {
            "ST": "PCE",
            "KG": "KGM",
            "M": "MTR",
            "L": "LTR"
          });
        }
      },
  
      _loadMoveReasons: function () {
        const oModel = this.getView().getModel("mainModel");
        const oODataModel = this.getView().getModel("odataModel");
        if (oODataModel) {
          oODataModel.read("/T157DSet", {
            filters: [new Filter("Bwart", FilterOperator.EQ, "551")],
            success: (oData) => {
              const aMotivos = [{ key: "", text: "Selecciona..." }];
              oData.results.forEach(item => {
                aMotivos.push({ key: item.Grund, text: item.Grdtx });
              });
              oModel.setProperty("/config/moveReasons", aMotivos);
            },
            error: () => {
              oModel.setProperty("/config/moveReasons", [
                { key: "", text: "Selecciona..." },
                { key: "0001", text: "Motivo 1 - Scrap" },
                { key: "0002", text: "Motivo 2 - Obsolescencia" }
              ]);
              this.showMessage("Error al cargar motivos de movimiento, usando valores por defecto");
            }
          });
        } else {
          oModel.setProperty("/config/moveReasons", [
            { key: "", text: "Selecciona..." },
            { key: "0001", text: "Motivo 1 - Scrap" },
            { key: "0002", text: "Motivo 2 - Obsolescencia" }
          ]);
        }
      },
  
      onTabSelect: function (oEvent) {
        const sKey = oEvent.getParameter("key");
        if (sKey === "OrdenCompleta" && !this.getView().getModel("mainModel").getProperty("/items").length) {
          this.showMessage("Agrega al menos un ítem antes de ver la orden completa");
          oEvent.preventDefault();
          const oTabBar = this.getView().byId("mainTabBar");
          if (oTabBar) oTabBar.setSelectedKey("Posicion");
          return;
        }
        if (sKey === "Posicion") {
          const oMaterialInput = this.getView().byId("material");
          if (oMaterialInput) {
            setTimeout(() => oMaterialInput.focus(), 100);
          }
        }
      },
  
      onReferenceTypeChange: function (oEvent) {
        const sKey = oEvent.getParameter("selectedItem").getKey();
        const oModel = this.getView().getModel("mainModel");
        oModel.setProperty("/header/reference_type", sKey);
  
        const sMoveType = sKey === "reserva" ? "201" : sKey === "orden" ? "261" : "";
        oModel.setProperty("/header/move_type", sMoveType);
  
        const oMoveTypeInput = this.getView().byId("moveTypeManual");
        if (oMoveTypeInput) oMoveTypeInput.setValue(sMoveType);
  
        const oRefDocNoInput = this.getView().byId("refDocNo");
        if (oRefDocNoInput) oRefDocNoInput.setValue("");
  
        this._resetCurrentItem();
        this._updatePositionFields();
      },
  
      _updatePositionFields: function () {
        const oModel = this.getView().getModel("mainModel");
        const sMoveType = oModel.getProperty("/savedHeader/move_type") || oModel.getProperty("/header/move_type") || "";
        const oView = this.getView();
  
        const oCostcenter = oView.byId("costcenter");
        const oOrderid = oView.byId("orderid");
        const oMoveReas = oView.byId("moveReas");
        const oReservNo = oView.byId("reservNo");
        const oResItem = oView.byId("resItem");
  
        if (oCostcenter) oCostcenter.setVisible(sMoveType === "201" || sMoveType === "551");
        if (oOrderid) oOrderid.setVisible(sMoveType === "261");
        if (oMoveReas) oMoveReas.setVisible(sMoveType === "551");
        if (oReservNo) oReservNo.setVisible(sMoveType === "201");
        if (oResItem) oResItem.setVisible(sMoveType === "201");
      },
  
      onSaveHeader: function () {
        const oModel = this.getView().getModel("mainModel");
        const oHeader = oModel.getProperty("/header");
  
        if (!this._validateHeader(oHeader)) return;
  
        oModel.setProperty("/savedHeader", { ...oHeader });
        this.showMessage("Cabecera guardada correctamente");
  
        oModel.setProperty("/header", this._getDefaultHeader());
  
        const oTabBar = this.getView().byId("mainTabBar");
        if (oTabBar) oTabBar.setSelectedKey("Posicion");
  
        this._updatePositionFields();
      },
  
      _validateHeader: function (oHeader) {
        if (!oHeader.reference_type) {
          this.showMessage("Selecciona una operación de almacén");
          return false;
        }
        if (!oHeader.doc_date || !oHeader.pstng_date || !oHeader.header_txt) {
          this.showMessage("Completa todos los campos obligatorios");
          return false;
        }
        if ((oHeader.reference_type === "reserva" || oHeader.reference_type === "orden") && !oHeader.ref_doc_no) {
          this.showMessage("Ingresa el documento de referencia");
          return false;
        }
        if (oHeader.reference_type === "otro" && !oHeader.move_type) {
          this.showMessage("Ingresa la clase de movimiento");
          return false;
        }
        return true;
      },
  
      onSaveItem: function () {
        const oModel = this.getView().getModel("mainModel");
        const oCurrentItem = oModel.getProperty("/currentItem");
        const oHeader = oModel.getProperty("/savedHeader");
  
        if (!this._validateItem(oCurrentItem, oHeader.move_type)) return;
  
        const oUOM = oModel.getProperty("/config/unitOfMeasureISO");
        const oNewItem = { ...oCurrentItem, orderpr_un_iso: oUOM[oCurrentItem.entry_uom] };
  
        const aItems = oModel.getProperty("/items") || [];
        aItems.push(oNewItem);
        oModel.setProperty("/items", aItems);
        oModel.setProperty("/itemCount", aItems.length);
  
        const oTable = this.getView().byId("itemsTable");
        if (oTable) {
          oTable.getBinding("items").refresh();
        }
  
        this._resetCurrentItem();
        this.showMessage("Ítem guardado");
  
        const oTabBar = this.getView().byId("mainTabBar");
        if (oTabBar) oTabBar.setSelectedKey("OrdenCompleta");
      },
  
      _validateItem: function (oItem, sMoveType) {
        if (!oItem.material || !oItem.entry_qnt || !oItem.entry_uom || !oItem.plant || !oItem.stge_loc) {
          this.showMessage("Completa los campos obligatorios: Material, Cantidad, UM, Centro, Almacén");
          return false;
        }
        if ((sMoveType === "201" || sMoveType === "551") && !oItem.costcenter.trim()) {
          this.showMessage("El campo Centro de Costo es obligatorio para este tipo de movimiento");
          return false;
        }
        if (sMoveType === "261" && !oItem.orderid.trim()) {
          this.showMessage("El campo Orden de Compra es obligatorio");
          return false;
        }
        if (sMoveType === "551" && !oItem.move_reas.trim()) {
          this.showMessage("El campo Motivo es obligatorio");
          return false;
        }
        if (sMoveType === "201" && (!oItem.reserv_no.trim() || !oItem.res_item.trim())) {
          this.showMessage("Los campos Reserva No e Ítem Reserva son obligatorios");
          return false;
        }
        const oUOM = this.getView().getModel("mainModel").getProperty("/config/unitOfMeasureISO");
        if (!oUOM[oItem.entry_uom]) {
          this.showMessage("Unidad de medida no válida");
          return false;
        }
        return true;
      },
  
      _resetCurrentItem: function () {
        const oModel = this.getView().getModel("mainModel");
        oModel.setProperty("/currentItem", {
          material: "",
          entry_qnt: "",
          entry_uom: "",
          batch: "",
          plant: "",
          stge_loc: "",
          costcenter: "",
          orderid: "",
          move_reas: "",
          position_txt: "",
          reserv_no: "",
          res_item: ""
        });
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
        oModel.setProperty("/header", this._getDefaultHeader());
        this.showMessage("Entrada de cabecera cancelada");
      },
  
      _getDefaultHeader: function () {
        return {
          pstng_date: new Date().toISOString().split("T")[0],
          doc_date: new Date().toISOString().split("T")[0],
          ref_doc_no: "",
          header_txt: "",
          move_type: "",
          reference_type: "",
          ver_gr_gi_slip: "3",
          ver_gr_gi_slipx: "X"
        };
      },
  
      onMoveReasValueHelp: function (oEvent) {
        const oInput = oEvent.getSource();
        if (!this._oValueHelpDialog) {
          Fragment.load({
            name: "logaligroup.mapeobapi.fragments.MoveReasValueHelp",
            controller: this
          }).then(oDialog => {
            this._oValueHelpDialog = oDialog;
            this.getView().addDependent(this._oValueHelpDialog);
            this._oValueHelpDialog.open();
          });
        } else {
          this._oValueHelpDialog.open();
        }
        this._oValueHelpDialog.bindAggregation("items", {
          path: "mainModel>/config/moveReasons",
          template: new sap.m.StandardListItem({
            title: "{mainModel>text}",
            description: "{mainModel>key}",
            key: "{mainModel>key}"
          })
        });
        this._oValueHelpDialog.attachConfirm(oEvent => {
          const oSelectedItem = oEvent.getParameter("selectedItem");
          if (oSelectedItem) {
            oInput.setValue(oSelectedItem.getTitle());
            this.getView().getModel("mainModel").setProperty("/currentItem/move_reas", oSelectedItem.getKey());
          }
        });
        this._oValueHelpDialog.attachSearch(oEvent => {
          const sValue = oEvent.getParameter("value");
          const oFilter = new Filter("text", FilterOperator.Contains, sValue);
          oEvent.getSource().getBinding("items").filter([oFilter]);
        });
      },
  
      onSubmit: function () {
        const oModel = this.getView().getModel("mainModel");
        const oHeader = oModel.getProperty("/savedHeader");
        const aItems = oModel.getProperty("/items");
  
        if (!aItems.length) {
          this.showMessage("Agrega al menos un ítem");
          return;
        }
  
        const oData = {
          GOODSMVT_HEADER: {
            PstngDate: oHeader.pstng_date,
            DocDate: oHeader.doc_date,
            RefDocNo: oHeader.ref_doc_no,
            HeaderTxt: oHeader.header_txt,
            VerGrGiSlip: oHeader.ver_gr_gi_slip,
            VerGrGiSlipx: oHeader.ver_gr_gi_slipx
          },
          GOODSMVT_CODE: { GmCode: "03" },
          GOODSMVT_ITEM: aItems.map(item => ({
            Material: item.material,
            Plant: item.plant,
            StgeLoc: item.stge_loc,
            Batch: item.batch,
            MoveType: oHeader.move_type,
            EntryQnt: parseFloat(item.entry_qnt),
            EntryUom: item.entry_uom,
            OrderprUnIso: item.orderpr_un_iso,
            Costcenter: item.costcenter || "",
            Orderid: item.orderid || "",
            MoveReas: item.move_reas || "",
            ReservNo: item.reserv_no || "",
            ResItem: item.res_item || ""
          }))
        };
  
        const oODataModel = this.getView().getModel("odataModel");
        oODataModel.create("/GoodsmvtHeaderSet", oData, {
          success: () => {
            this.showMessage("Orden creada con éxito");
            oModel.setProperty("/items", []);
            oModel.setProperty("/itemCount", 0);
            oModel.setProperty("/savedHeader", {});
            const oTabBar = this.getView().byId("mainTabBar");
            if (oTabBar) oTabBar.setSelectedKey("Cabecera");
          },
          error: () => this.showMessage("Error al crear la orden")
        });
      },
  
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
              this.showMessage("Error: Tabla no encontrada");
            }
          } else {
            this.showMessage("Error: Índice inválido");
          }
        } else {
          this.showMessage("Error: No se pudo determinar el ítem a eliminar");
        }
      },
  
      onScanMaterial: function () {
        if (!this._oBarcodeScannerDialog) {
          Fragment.load({
            name: "logaligroup.mapeobapi.fragments.BarcodeScannerDialog",
            controller: this
          }).then(oDialog => {
            this._oBarcodeScannerDialog = oDialog;
            this.getView().addDependent(this._oBarcodeScannerDialog);
            this._oBarcodeScannerDialog.open();
            const oInput = this.byId("barcodeInput");
            if (oInput) {
              setTimeout(() => oInput.focus(), 100);
            }
          });
        } else {
          this._oBarcodeScannerDialog.open();
          const oInput = this.byId("barcodeInput");
          if (oInput) {
            setTimeout(() => oInput.focus(), 100);
          }
        }
      },
  
      onScanBarcode: function () {
        const oInput = this.byId("barcodeInput");
        if (oInput) {
          const sValue = oInput.getValue().trim();
          if (sValue) {
            this.onBarcodeScanned({ getParameter: () => sValue });
          } else {
            this.showMessage("Por favor, ingresa o escanea un código de material");
          }
        }
      },
  
      onBarcodeScanned: function (oEvent) {
        const sScannedValue = oEvent.getParameter("value").trim();
        const oModel = this.getView().getModel("mainModel");
        oModel.setProperty("/currentItem/material", sScannedValue);
        this._validateMaterial(sScannedValue);
        if (this._oBarcodeScannerDialog) {
          this._oBarcodeScannerDialog.close();
        }
        const oMaterialInput = this.getView().byId("material");
        if (oMaterialInput) {
          oMaterialInput.setValue(sScannedValue);
          setTimeout(() => oMaterialInput.focus(), 100);
        }
      },
  
      onCloseBarcodeDialog: function () {
        if (this._oBarcodeScannerDialog) {
          this._oBarcodeScannerDialog.close();
        }
      },
  
      _validateMaterial: function (sMaterial) {
        if (sMaterial) {
          this.showMessage(`Material escaneado: ${sMaterial}`);
        } else {
          this.showMessage("Código de material inválido");
        }
      }
    });
  });