import GeocodingExtension from './GeocodingExtension';
import register from './extras';


/* bundle registry operations */
class GeocodingBundle {
    create() {
        return new GeocodingExtension();
    }
}

register(GeocodingBundle,'geocoding',"Oskari.geocoding.GeocodingBundle");


