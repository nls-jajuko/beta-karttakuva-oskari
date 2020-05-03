/* Geocoding Service for Oskari */
export class GeocodingService {

    queryParams = {
        'api-key': '7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2',
        'sources': 'geographic-names'
    }

    constructor(urls, epsgCode, lang) {
        this.urls = urls;
        this.queryParams.crs = 'http://www.opengis.net/def/crs/EPSG/0/' + epsgCode;
        this.queryParams['request-crs'] = 'http://www.opengis.net/def/crs/EPSG/0/' + epsgCode;
        this.queryParams.lang = lang;
    }

    search(searchString) {
        let url =
            this.geocodingURL('search', {
                'size': '50',
                'text': searchString
            });

        if (this.geocoding_controller) {
            this.geocoding_controller.abort();
        }
        this.geocoding_controller = new AbortController();
        this.geocoding_signal = this.geocoding_controller.signal;

        return fetch(url, {
            method: 'get',
            signal: this.geocoding_signal
        });
    }

    reverse(lonlat) {
        let url =
            this.geocodingURL('reverse', {
                'size': '20',
                'boundary.circle.radius': 100,
                'point.lon': lonlat.lon,
                'point.lat': lonlat.lat
            });

        if (this.geocoding_controller) {
            this.geocoding_controller.abort();
        }
        this.geocoding_controller = new AbortController();
        this.geocoding_signal = this.geocoding_controller.signal;

        return fetch(url, {
            method: 'get',
            signal: this.geocoding_signal
        });
    }

    similar(searchString) {
        let url = this.geocodingURL('similar', {
            'size': '10',
            'text': searchString
        });

        if (this.similar_controller) {
            this.similar_controller.abort();
        }
        this.similar_controller = new AbortController();
        this.similar_signal = this.similar_controller.signal;

        return fetch(url, {
            method: 'get',
            signal: this.similar_signal
        });

    }

    geocodingURL(urlkey, args) {
        let search = new URLSearchParams(),
            params = this.queryParams,
            combined = { ...params, ...args };
        for (let [key, value] of Object.entries(combined)) {
            search.append(key, value);
        }
        return this.urls[urlkey] + search.toString();
    }

}