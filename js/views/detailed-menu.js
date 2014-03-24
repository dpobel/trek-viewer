YUI.add('detailed-menu', function (Y) {
    "use strict";

    Y.namespace('TV');

    Y.TV.DetailedMenu = Y.Base.create('detailedMenu', Y.View, [], {
        events: {
            '.load-another': {
                'tap': '_loadAnother'
            },
            '.fit-trek': {
                'tap': '_fitMap'
            },
            '.zoom-start': {
                'tap': '_zoomStart'
            },
            '.toggle-chart': {
                'tap': '_toggleChart'
            }
        },

        initializer: function () {
            this.containerTemplate = '<div class="trek-viewer-detailed-menu"></div>';
            this.template = Y.Handlebars.compile(Y.one('#detailedMenu-tpl').getHTML());
        },

        _getTrackInfo: function () {
            var track = this.get('track');

            return {
                isLoop: track.isLoop(),
                name: track.get('name'),
                distance: (track.get('distance') / 1000).toFixed(1),
                elevation: {
                    gain: Math.round(track.get('globalElevation').gain),
                    loss: Math.round(track.get('globalElevation').loss)
                },
            };
        },

        render: function () {
            this.get('container').setContent(
                this.template(this._getTrackInfo()
            ));

            return this;
        },

        _loadAnother: function (e) {
            e.preventDefault();
            this.fire('loadNew');
        },

        _fitMap: function (e) {
            e.preventDefault();
            this.fire('fitMap');
        },

        _zoomStart: function (e) {
            e.preventDefault();
            this.fire('zoomStart');
        },

        _toggleChart: function (e) {
            e.preventDefault();
            this.fire('toggleChart');
        }
    }, {
        ATTRS: {
            track: {
                value: null
            },
        }
    });
});
