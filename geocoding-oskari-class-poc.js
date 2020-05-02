/* Quick Geocoding Tab for Oskari */
class GeocodingView extends Oskari.clazz.get('Oskari.mapframework.bundle.search.DefaultView') {

    __doSearch() {
        let self = this,
            lang = Oskari.getLang(),
            sandbox = this.sandbox,
            epsg = sandbox.findRegisteredModuleInstance('MainMapModule').getProjection(),
            epsgCode = epsg.split(':')[1],
            field = this.getField(),
            searchContainer = this.getContainer(),
            searchString = field.getValue(this.instance.safeChars),
            resultsEl = searchContainer[0].querySelectorAll('div.resultList'),
            infoEl = searchContainer[0].querySelectorAll('div.info');

        while (resultsEl.firstChild)
            resultsEl.removeChild(resultsEl.firstChild);
        while (infoEl.firstChild)
            infoEl.removeChild(infoEl.firstChild);

        if (!searchString || searchString.length == 0) {
            return;
        }

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
                locations: json.features.map(f => {
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
                        "channelId": "GEOCODING"
                    }
                })
            };
            res.totalCount = res.locations.length;
            self.handleSearchResult(true, res, searchString);

        }).catch(function (err) {
        });
    }

    __doAutocompleteSearch() {
        let lang = Oskari.getLang(),
            field = this.getField(),
            searchString = field.getValue(this.instance.safeChars);

        if (!searchString || searchString.length == 0) {
            return;
        }

        this.__doSearch();

        let url = 'https://avoin-paikkatieto.maanmittauslaitos.fi'
            + '/geocoding/v1/searchterm/similar?'
            + '&lang=' + lang
            + '&api-key=7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2'
            + '&size=10'
            + '&text=' + searchString;

        if (this.similar_controller) {
            this.similar_controller.abort();
        }
        this.similar_controller = new AbortController();
        this.similar_signal = this.similar_controller.signal;

        fetch(url, {
            method: 'get',
            signal: this.similar_signal
        }).then(r => r.json()).then(json => {
            if (!json.terms || !json.terms.length) {
                return;
            }

            let autocompleteValues = json.terms.map(f => {
                return {
                    value: f.text.indexOf(' ') != -1 ? '"' + f.text + '"' : f.text, data: f.text
                };
            });

            field.autocomplete(autocompleteValues);
        }).catch(function (err) {
        })
    }
    _validateSearchKey(key) {
        return true;
    }
}

/** 'install' */
(function () {
    let tab = document.createElement("div"),
        sandbox = Oskari.getSandbox(),
        lang = Oskari.getLang(),
        search = sandbox.findRegisteredModuleInstance('Search'),
        title = {
            'fi': 'Geokoodauspalvelu',
            'sv': 'Geokodning',
            'en': 'Geocoding'
        }[lang];

    search.conf.autocomplete = true;

    let view = new GeocodingView(search);
    view.createUi(tab);

    sandbox.request(search, Oskari.requestBuilder('Search.AddTabRequest')(
        title, tab, 2, 'oskari_search_tabpanel_header'));
})();