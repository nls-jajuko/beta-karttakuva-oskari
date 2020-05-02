import GeocodingView from './GeocodingView';

/** extension module class */
const UIDefaultExtension = Oskari.clazz.get('Oskari.userinterface.extension.DefaultModule');

export class GeocodingExtension extends UIDefaultExtension {
    name = 'Geocoding';

    conf = {
        autocomplete: true

    }

    eventHandlers = {
        'userinterface.ExtensionUpdatedEvent': ev => {
            console.log(ev);
        }
    }

    afterStart(sandbox) {
        let tab = document.createElement("div"),
            lang = Oskari.getLang(),
            title = {
                'fi': 'Geokoodauspalvelu',
                'sv': 'Geokodning',
                'en': 'Geocoding'
            }[lang];

        let view = new GeocodingView(this);
        view.createUi(tab);

        sandbox.request(this, Oskari.requestBuilder('Search.AddTabRequest')(
            title, tab, 2, 'oskari_search_tabpanel_header'));


    }
}