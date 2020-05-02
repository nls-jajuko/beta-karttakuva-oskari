import GeocodingExtension from './GeocodingExtension';


/* bundle registry operations */
class GeocodingBundle {
    create() {
        return new GeocodingExtension();
    }
}

const Geocoding_name = 'geocoding',
    Geocoding_class = "Oskari.geocoding.GeocodingBundle";

Oskari.clazz.defineES(
    Geocoding_class,
    GeocodingBundle, {
    "protocol": ["Oskari.bundle.Bundle",
        "Oskari.mapframework.bundle.extension.ExtensionBundle"],
    "bundle": {
        "manifest": {
            "Bundle-Identifier": Geocoding_name,
            "Bundle-Name": Geocoding_name,
            "Bundle-Version": "1.0.0",
        }
    }
});

Oskari.bundle_manager.installBundleClass(Geocoding_name,
    Geocoding_class);
