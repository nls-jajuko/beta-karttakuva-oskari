import GeocodingService from './GeocodingService';

const SearchDefaultView = Oskari.clazz.get('Oskari.mapframework.bundle.search.DefaultView');

/* Geocoding Tab for Oskari */
export class GeocodingView extends SearchDefaultView {
    constructor(instance) {
        super(instance);
        let epsg = this.sandbox.findRegisteredModuleInstance('MainMapModule').getProjection(),
            epsgCode = epsg.split(':')[1],
            lang = Oskari.getLang(),
            urls = instance.conf.urls;

        this.service = new GeocodingService(urls, epsgCode, lang);
        this.lastSearchString = undefined;
    }

    createUi(tab) {
        super.createUi(tab);
        let searchContainerEl = this.getContainer()[0],
            controlsEl = searchContainerEl.querySelector('div.controls'),
            similarEl = document.createElement('div');
        controlsEl.appendChild(similarEl)
        this.similarEl = similarEl;

    }

    __checkSearchString(searchString) {
        if (!searchString || searchString.length == 0) {
            return false;
        }
        if (this.lastSearchString === searchString) {
            return false;
        }
        return true;
    }

    __doSearch() {
        let self = this,
            field = this.getField(),
            button = this.getButton(),
            searchContainer = this.getContainer(),
            searchString = field.getValue(this.instance.safeChars),
            resultsEl = searchContainer[0].querySelectorAll('div.resultList'),
            infoEl = searchContainer[0].querySelectorAll('div.info');



        if (!this.__checkSearchString(searchString)) {
            self.progressSpinner.stop();
            field.setEnabled(true);
            button.setEnabled(true);
            return;
        }

        while (resultsEl.firstChild)
            resultsEl.removeChild(resultsEl.firstChild);
        while (infoEl.firstChild)
            infoEl.removeChild(infoEl.firstChild);

        this.service.search(searchString).then(r => r.json()).then(json => {
            let res = {
                locations: json.features.map(f => {
                    return {
                        "zoomScale": 5000,
                        "name": f.properties.label,
                        "rank": f.properties.rank,
                        "lon": f.geometry.coordinates[0],
                        "id": f.properties.placeId,
                        "type": f.properties['label:placeType'],
                        "region": f.properties['label:municipality'],
                        "village": f.properties['label'],
                        "lat": f.geometry.coordinates[1],
                        "channelId": "GEOCODING"
                    }
                })
            };
            res.totalCount = res.locations.length;
            if (res.totalCount == 0) {
                res.totalCount = -2;
            }
            self.lastSearchString = searchString;
            self.handleSearchResult(true, res, searchString);

        }).catch(function (err) {
            /* we fail often due to autocomplete*/
        });
    }

    __doAutocompleteSearch() {
        let self = this,
            field = self.getField(),
            searchString = field.getValue(this.instance.safeChars);

        if (!searchString || searchString.length == 0) {
            return;
        }
        if (this.lastSimilarString === searchString) {
            return;
        }

        this.__doSearch();

        this.service.similar(searchString).then(r => r.json()).then(json => {
            if (!json.terms || !json.terms.length) {
                return;
            }

            let autocompleteValues = json.terms.map(f => {
                return {
                    value: f.text.indexOf(' ') != -1 ? '"' + f.text + '"' : f.text,
                    data: f.text
                };
            });
            this.lastSimilarString = searchString;

            self.renderSimilar(autocompleteValues);

        }).catch(function (err) {
        });
    }

    renderSimilar(autocompleteValues) {
        let similarEl = this.similarEl,
            self = this;
        while (similarEl.firstChild)
            similarEl.removeChild(similarEl.firstChild);

        autocompleteValues.forEach(e => {
            let spacing = document.createTextNode(' '),
                el = document.createElement('a');
            el.setAttribute('href', 'javascript:void(0)');
            el.innerHTML = e.value;
            el.dataset.value = e.value;
            el.addEventListener("click", ev => {
                self.getField().setValue(ev.target.dataset.value);
                self.__doAutocompleteSearch();
            });
            similarEl.appendChild(el);
            similarEl.appendChild(spacing);
        });
    }

    _validateSearchKey(key) {
        return true;
    }

    __getSearchResultHeader(count, hasMore) {
        return "";
    }
}
