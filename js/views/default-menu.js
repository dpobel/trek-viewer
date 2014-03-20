YUI.add('default-menu', function (Y) {
    "use strict";

    Y.namespace('TV');

    Y.TV.DefaultMenu = Y.Base.create('defaultMenu', Y.View, [], {
        events: {
            'form': {
                'submit': '_loadGpx'
            }
        },

        initializer: function () {
            this.containerTemplate = '<div class="trek-viewer-default-menu"></div>';
            this.template = Y.Handlebars.compile(Y.one('#defaultMenu-tpl').getHTML());
        },

        render: function () {
            this.get('container').setContent(this.template());

            return this;
        },

        _loadGpx: function (e) {
            e.preventDefault();

            this.fire('loadGPXUrl', {
                url: this.get('container').one('input[type=url]').get('value')
            });
        }
    }, {
        ATTRS: {}
    });
});
