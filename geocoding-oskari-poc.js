/* Quick Geocoding Tab for Oskari */
Oskari.clazz.define(
    'Oskari.mapframework.bundle.search.GeocodingView',
    instance => {
        Object.assign(this, {
            instance: instance,
            sandbox: instance.getSandbox(),
            searchservice: instance.service,
            state: null,
            lastResult: null,
            lastSort: null,
            resultActions: {},
            _searchContainer: null,
            resultHeaders: [
                {
                    title: instance.getLocalization('grid').name,
                    prop: 'name'
                }, {
                    title: instance.getLocalization('grid').region,
                    prop: 'region'
                }, {
                    title: instance.getLocalization('grid').type,
                    prop: 'type'
                }
            ]
        });
    }, {
    __doSearch: function () {
        let me = this,
            field = this.getField(),
            button = this.getButton(),
            searchContainer = this.getContainer(),
            searchString = field.getValue(this.instance.safeChars);

        searchContainer.find('div.resultList').empty();
        searchContainer.find('div.info').empty();

        if (!searchString || searchString.length == 0) {
            field.setEnabled(true);
            button.setEnabled(true);
            return;
        }

        let self = this,
            lang = Oskari.getLang(),
            sb = this.sandbox || Oskari.getSandbox(),
            epsg = sb.findRegisteredModuleInstance('MainMapModule').getProjection(),
            epsgCode = epsg.split(':')[1];

        let url = 'https://avoin-paikkatieto.maanmittauslaitos.fi'
            + '/geocoding/v1/pelias/search?'
            + '&sources=addresses,geographic-names'
            + '&lang=' + lang
            + '&api-key=7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2'
            + '&crs=http://www.opengis.net/def/crs/EPSG/0/' + epsgCode
            + '&size=50'
            + '&text=' + searchString;

        if (this.geocoding_controller) {
            this.geocoding_controller.abort();
        }
        this.geocoding_controller = new AbortController();
        this.geocoding_signal = this.geocoding_controller.signal;

        fetch(url, {
            method: 'get',
            signal: this.geocoding_signal
        }).then(r => r.json()).then(json => {
            let res = {
                "locations": [],
                "totalCount": 0
            };

            res.locations = json.features.map(f => {
                let fprops = f.properties;
                return {
                    "zoomScale": 5000,
                    "name": fprops.label,
                    "rank": fprops.rank,
                    "lon": f.geometry.coordinates[0],
                    "id": fprops.placeId,
                    "type": fprops['label:placeType'],
                    "region": fprops['label:municipality'],
                    "village": fprops['label'],
                    "lat": f.geometry.coordinates[1],
                    "channelId": "REGISTER_OF_NOMENCLATURE_CHANNEL"
                };
            });
            res.totalCount = res.locations.length;

            self.handleSearchResult(true, res, searchString);

        }).catch(function (err) {
        });
    },
    __doAutocompleteSearch: function () {
        this.__doSearch();


        let lang = Oskari.getLang(),
            field = this.getField(),
            searchString = field.getValue(this.instance.safeChars);

        if (!searchString || searchString.length == 0) {
            return;
        }

        let url = 'https://avoin-paikkatieto.maanmittauslaitos.fi'
            + '/geocoding/v1/searchterm/similar?'
            + '&lang=' + lang
            + '&api-key=7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2'
            + '&size=10'
            + '&text=' + searchString;

        fetch(url, {
            method: 'get'
        }).then(r => r.json()).then(json => {

            var autocompleteValues = json.terms.map(f => {
                return {
                    value: '"' + f.text + '"', data: f.text
                };
            });

            field.autocomplete(autocompleteValues);
        }).catch(function (err) {
        })
    },
    _validateSearchKey: function (key) { return true; }
}, {
    extend: ['Oskari.mapframework.bundle.search.DefaultView']
});

/** 'install' */
(function () {
    let tab = jQuery('<div />'),
        sandbox = Oskari.getSandbox(),
        lang = Oskari.getLang(),
        search = sandbox.findRegisteredModuleInstance('Search'),
        title = {
            'fi': 'Geokoodauspalvelu',
            'sv': 'Geokodning',
            'en': 'Geocoding'
        }[lang];

    search.conf.autocomplete = true;

    let view = Oskari.clazz.create('Oskari.mapframework.bundle.search.GeocodingView', search);
    view.createUi(tab);

    let priority = 2,//this.tabPriority,
        id = 'oskari_search_tabpanel_header',
        req = Oskari.requestBuilder('Search.AddTabRequest')(title, tab, priority, id);

    sandbox.request(search, req);
})();
