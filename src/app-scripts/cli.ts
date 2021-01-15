// Need configurations in case the goal is to see what configurations are missing
import configurations from '../configurations';
// Need this import so that everything gets loaded
import '../server';

(async () => {
    await configurations.loadPromise;
})();
