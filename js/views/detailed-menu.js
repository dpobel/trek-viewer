YUI.add('detailed-menu', function (Y) {
    "use strict";

    var ALT_SAME_POINT = 5,
        COORD_SAME_POINT = 0.01;

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

        _getGpxInfo: function () {
            var gpx = this.get('gpx'),
                isLoop = false,
                start = this.get('start'),
                end = this.get('end'),
                gain = gpx.get_elevation_gain(),
                loss = gpx.get_elevation_loss();

            if (
                Math.abs(gain - loss) < ALT_SAME_POINT
                && Math.abs(start.lat - end.lat) < COORD_SAME_POINT
                && Math.abs(end.lng - end.lng) < COORD_SAME_POINT
            ) {
                isLoop = true;
            }
            
            return {
                isLoop: isLoop,
                name: gpx.get_name(),
                distance: gpx.m_to_km(gpx.get_distance()).toFixed(1),
                elevation: {
                    gain: parseInt(gpx.get_elevation_gain(), 10),
                    loss: parseInt(gpx.get_elevation_loss(), 10)
                },
            };
        },

        render: function () {
            this.get('container').setContent(
                this.template(this._getGpxInfo()
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
            gpx: {
                value: null
            },

            start: {
                value: null
            },

            end: {
                value: null
            },
        }
    });
});
