define(['js/ui/SelectionView'], function (SelectionView) {
    return SelectionView.inherit('sprd.view.ColorSelectorClass', {
        defaults: {
            componentClass: 'product-appearances color-selector',
            itemKey: 'appearance',
            colorWidth: 25,
            multiSelect: false,

            productType: null,

            tagName: "ul",
            items: "{productType.appearances}"
//            needsSelection: "{hasSelection()}"
        },

        initialize: function () {
            this.bind('change:productType', this._onProductTypeChange, this);
            this.callBase();
        },

        _onProductTypeChange: function () {

            var productType = this.$.productType,
                appearances;

            if (!productType) {
                this.set('_appearances', null);
            } else {
                appearances = productType.$.appearances;
                if (appearances !== this.$items) {
                    this.set('_appearances', appearances);
                    if (!this.$.selectedItem || !productType.getAppearanceById(this.$.selectedItem.$.id)) {
                       this.set('selectedItem', productType.getDefaultAppearance());
                    }
                }
            }
        }
    })
});