YUI.add('gpx-file', function (Y) {

    Y.namespace('TV');

    var COORD_SAME_POINT_DIFF = 0.001;

    Y.TV.GPXFile = Y.Base.create('gpxFile', Y.Base, [], {

        initializer: function () {
            this.on('xmlChange', this._parseXml);
            this._parseXml();
        },

        _parseXml: function () {
            var xml = this.get('xml'),
                parser = new DOMParser(), doc;

            if ( !xml ) {
                return;
            }

            doc = parser.parseFromString(xml, "text/xml");
            if ( !doc || !doc.documentElement || doc.documentElement.nodeName === "parsererror" ) {
                throw new TypeError("XML is invalid");
            }

            if ( doc.documentElement.nodeName !== 'gpx' ) {
                throw new TypeError('XML is not a gpx file content');
            }

            this._parseMeta(doc);
            this._parseTracks(doc);
        },

        _parseMeta: function (doc) {
            var meta = doc.documentElement.getElementsByTagName('metadata').item(0);

            if ( !meta ) {
                return;
            }
            if ( meta.getElementsByTagName('name').length ) {
                this.set(
                    'name',
                    meta.getElementsByTagName('name').item(0).textContent
                );
            }
            // TODO: add author metadata
        },

        _parseTracks: function (doc) {
            var trackElts = doc.documentElement.getElementsByTagName('trk'),
                i = 0,
                track,
                tracks = [];

            for(i = 0; i != trackElts.length; i++) {
                track = this._parseTrack(trackElts[i]);
                if ( !track.get('name') ) {
                    track.set('name', this.get('name') + ' (' + i + ')');
                }
                tracks.push(track);
            }
            this.set('tracks', tracks);
        },

        _parseTrack: function (trackElt) {
            var track = new Y.TV.GPXTrack(),
                points = trackElt.getElementsByTagName('trkpt'),
                i = 0, point;

            if ( trackElt.getElementsByTagName('name').length ) {
                track.set(
                    'name',
                    trackElt.getElementsByTagName('name').item(0).textContent
                );
            }

            for(i = 0; i != points.length; i++) {
                point = points.item(i);

                track.addPoint({
                    lat: parseFloat(point.getAttribute('lat')),
                    lng: parseFloat(point.getAttribute('lon')),
                    ele: parseFloat(
                        point.getElementsByTagName('ele').item(0).textContent
                    )
                });
            }
            return track;
        }

    }, {
        ATTRS: {
            xml: {
                value: ""
            },

            name: {
                value: ""
            },

            author: {
                value: null
            },

            bounds: {
                value: null
            },

            tracks: {
                value: []
            }
        }
    });

    Y.TV.GPXTrack = Y.Base.create('gpxTrack', Y.Base, [], {

        getStartPoint: function () {
            return this.get('points')[0];
        },

        getEndPoint: function () {
            var points = this.get('points');

            return points[points.length - 1];
        },

        isLoop: function () {
            var start = this.getStartPoint(),
                end = this.getEndPoint();
            
            return (
                Math.abs(start.lat - end.lat) < COORD_SAME_POINT_DIFF
                && Math.abs(end.lng - end.lng) < COORD_SAME_POINT_DIFF
            );
        },

        addPoint: function (p) {
            var points = this.get('points'),
                distance = this.get('distance'),
                elevation = this.get('elevation'),
                lastElevation = false,
                point = {
                    lat: p.lat,
                    lng: p.lng,
                };

            if ( elevation.length ) {
                lastElevation = elevation[elevation.length - 1].elevation;
            }

            if ( points.length > 0 ) {
                distance += this._dist3d({
                    lat: points[points.length - 1].lat,
                    lng: points[points.length - 1].lng,
                    ele: elevation[points.length - 1].elevation
                }, p);
                this._set('distance', distance);
            }

            points.push(point);

            if ( lastElevation ) {
                if ( p.ele > lastElevation ) {
                    this.get('globalElevation').gain += p.ele - lastElevation;
                } else {
                    this.get('globalElevation').loss += lastElevation - p.ele;
                }
            }

            elevation.push({
                distance: distance / 1000,
                elevation: p.ele,
            });
        },

        _dist2d: function (a, b) {
            var R = 6371000,
                dLat = this._deg2rad(b.lat - a.lat),
                dLon = this._deg2rad(b.lng - a.lng),
                r = Math.sin(dLat/2) *
                    Math.sin(dLat/2) +
                    Math.cos(this._deg2rad(a.lat)) *
                    Math.cos(this._deg2rad(b.lat)) *
                    Math.sin(dLon/2) *
                    Math.sin(dLon/2);

            return R * 2 * Math.atan2(Math.sqrt(r), Math.sqrt(1-r));
        },

        _dist3d: function (a, b) {
            var planar = this._dist2d(a, b),
                height = Math.abs(b.ele - a.ele);

            return Math.sqrt(Math.pow(planar, 2) + Math.pow(height, 2));
        },

        _deg2rad: function (deg) {
            return deg * Math.PI / 180;
        }
    }, {
        ATTRS: {
            name: {
                value: ""
            },

            points: {
                value: []
            },

            elevation: {
                value: []
            },

            globalElevation: {
                value: {
                    gain: 0,
                    loss: 0
                }
            },

            distance: {
                value: 0
            }
        }
    });
});
