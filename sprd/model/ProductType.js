define(["sprd/data/SprdModel", 'js/core/List', 'sprd/model/ProductTypeView'], function (SprdModel, List, ProductTypeView) {
    return SprdModel.inherit("sprd.model.ProductType", {

	    $mapAttributes: {
		    views: ProductTypeView
	    },

        getViewById: function(id){
            if(this.$.views){
                for (var i = 0; i < this.$.views.$items.length; i++) {
                    var view = this.$.views.$items[i];
                    if(view.id === id){
                        return view;
                    }
                }
            }
            return null;
        },
        getDefaultView: function () {
            if (this.$.defaultValues) {
                return this.getViewById(this.$.defaultValues.defaultView.id);
            }
            return null;
        },
        getDefaultAppearance: function () {
            if (this.$.defaultValues) {
                return this.getAppearanceById(this.$.defaultValues.defaultAppearance.id);
            }
            return null;
        },
        getAppearanceById: function(id){
            if(this.$.appearances){
                var app;
                for (var i = 0; i < this.$.appearances.$items.length; i++) {
                    app = this.$.appearances.$items[i];
                    if (id === app.id) {
                        return app;
                    }
                }
            }
            return null;
        }
    })
});