const puppeteer = require('puppeteer');

describe('Assignment 2 tests', () => {
    let browser;
    let page;

    const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8000';
    const HEADLESS = process.env.HEADLESS !== 'false';

    const randomUsername = `testuser_${Math.random().toString(36).substring(2, 8)}`;
    const randomEmail = `${randomUsername}@mail.com`;
    const randomPass = `testuserpass`;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: HEADLESS,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('Login Page loads successfully', async () => {
        await page.goto(`${BASE_URL}/`);

        await page.waitForSelector('body');

        const title = await page.title();
        expect(title).toBe('Login');
    }, 20000);

    test('Logging in with credentials that does not exist should not work', async () => {
        await page.goto(`${BASE_URL}/login`);

        await page.type('#username', randomUsername);
        await page.type('#password', randomPass);
        await Promise.all([
            page.waitForNavigation(),
            page.click('#submitButton'),
        ]);

        const successMessage = await page.$eval('.alert', el => el.textContent);
        expect(successMessage).toContain('Incorrect username or password');
    }, 20000);


    test('Signing Up success', async () => {
        await page.goto(`${BASE_URL}/signup`);

        const title = await page.title();
        expect(title).toBe('Register');


        await page.type('#username', randomUsername);
        await page.type('#password', randomPass);
        await page.type('#email', randomEmail);
        await Promise.all([
            page.waitForNavigation(),
            page.click('#submitButton'),
        ]);

        expect(page.url()).toBe(`${BASE_URL}/login`);

        const successMessage = await page.$eval('.alert', el => el.textContent);
        expect(successMessage).toContain('Registration completed! Sign in now!');
    }, 20000);


    test('Signing Up should reject duplicates', async () => {
        await page.goto(`${BASE_URL}/signup`);

        const title = await page.title();
        expect(title).toBe('Register');


        await page.type('#username', randomUsername);
        await page.type('#password', randomPass);
        await page.type('#email', randomEmail);
        await Promise.all([
            page.waitForNavigation(),
            page.click('#submitButton'),
        ]);

        expect(page.url()).toBe(`${BASE_URL}/signup`);

        const successMessage = await page.$eval('.alert', el => el.textContent);
        expect(successMessage).toContain('Username or email already exists');
    }, 20000);


    test('Login should redirect to main dashboard', async () => {
        await page.goto(`${BASE_URL}/login`);

        await page.type('#username', randomUsername);
        await page.type('#password', randomPass);
        await Promise.all([
            page.waitForNavigation(),
            page.click('#submitButton'),
        ]);
        expect(page.url()).toBe(`${BASE_URL}/pokemon`);

        const title = await page.title();
        expect(title).toBe('Assignment 2');
    }, 20000);

    test('The pokemon page should load and render content', async () => {
        await page.goto(`${BASE_URL}/pokemon`);

        await page.waitForSelector('.card');

        const isPokemonMenuActive = await page.$eval('a[href="/pokemon"]', el => el.classList.contains('active'));
        expect(isPokemonMenuActive).toBe(true);

        const cardCount = await page.$$eval('.card', cards => cards.length);
        expect(cardCount).toBe(801);

        const everyCardHasPokemonNameAsh5 = await page.$$eval('.card', cards => {
            return cards.every(card => {
                const h5 = card.querySelector('h5');
                return h5 && h5.textContent.trim().length > 0;
            });
        });
        expect(everyCardHasPokemonNameAsh5).toBe(true);


        const everyCardHasWeightAndHeightLabels = await page.$$eval('.card', cards => {
            return cards.every(card => {
                const strongElements = card.querySelectorAll('strong');
                return strongElements.length === 2 &&
                    strongElements[0].textContent.trim().length > 0 &&
                    strongElements[1].textContent.trim().length > 0 &&
                    (strongElements[0].textContent.trim() == "Weight" || strongElements[0].textContent.trim() == "Height")
                    ;
            });
        });
        expect(everyCardHasWeightAndHeightLabels).toBe(true);


        const everyCardHasWeightAndHeightValues = await page.$$eval('.card', cards => {
            return cards.every(card => {
                const weightElem = card.querySelector('.pokemon_weight');
                const heightElem = card.querySelector('.pokemon_height');

                if (!weightElem || !heightElem) return false;

                const weightText = weightElem.textContent.trim();
                const heightText = heightElem.textContent.trim();

                const oneDecimalRegex = /^\d+\.\d$/;
                return oneDecimalRegex.test(weightText) && oneDecimalRegex.test(heightText);
            });
        });
        expect(everyCardHasWeightAndHeightValues).toBe(true);

        const cardCaptureBtnText = await page.$$eval('.card', cards => {
            return cards.every(card => {
                const capBtn = card.querySelector('.capture-button');
                return capBtn.textContent.trim() == "Capture"
            });
        });
        expect(cardCaptureBtnText).toBe(true);

        const extractedIds = await page.$$eval('.card', cards => {
            return cards.map(card => {
                const img = card.querySelector('img');
                if (!img) return null;
                const match = img.src.match(/^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/(\d+)\.png$/);
                if (!match) return null;
                return parseInt(match[1], 10);
            });
        });

        expect(extractedIds.every(id => id !== null)).toBe(true);

        const sortedIds = [...extractedIds].sort((a, b) => a - b);
        const expectedIds = Array.from({ length: 801 }, (_, i) => i + 1);
        expect(sortedIds).toEqual(expectedIds);

        await page.type('input[name="q"]', 'saur');
        await Promise.all([
            page.waitForNavigation(),
            page.click('button[type="submit"]')
        ]);

        const searchCardCount = await page.$$eval('.card', cards => cards.length);
        expect(searchCardCount).toBe(3);

        const saurNames = await page.$$eval('.card .card-title', headers =>
            headers.map(h => h.textContent.trim().toLowerCase())
        );
        expect(saurNames.sort()).toEqual(['bulbasaur', 'ivysaur', 'venusaur'].sort());
    }, 20000);


    test('Clicking every single capture button should render a modal with the name of the pokemon in it', async () => {
        await page.goto(`${BASE_URL}/pokemon`);

        await page.waitForSelector('.card');

        const { allModalsCorrect, allNames } = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.card'));
            const names = [];
            for (const card of cards) {
                const pokemonName = card.querySelector('.card-title').textContent.trim();
                names.push(pokemonName);

                const btn = card.querySelector('.capture-button');
                btn.click();

                const modal = document.querySelector('#captureModal');
                if (!modal) return { allModalsCorrect: false, allNames: [] };

                if (!modal.textContent.includes(pokemonName)) {
                    return { allModalsCorrect: false, allNames: [] };
                }
            }
            return { allModalsCorrect: true, allNames: names };
        });

        expect(allModalsCorrect).toBe(true);

        const uniqueNames = new Set(allNames);
        expect(allNames.length).toBe(uniqueNames.size);
    }, 60000);

    test('Catch a pikachu successfully', async () => {
        await page.goto(`${BASE_URL}/pokemon`);

        await page.waitForSelector('.card');

        const pikachuCard = await page.evaluateHandle(() => {
            const cards = Array.from(document.querySelectorAll('.card'));
            return cards.find(card => card.querySelector('.card-title').textContent.trim() === 'Pikachu');
        });

        const captureBtn = await pikachuCard.$('.capture-button');
        await captureBtn.click();

        await page.waitForSelector('#captureModal.show', { visible: true });

        await page.type('#nickname', 'iLoveMyAssignment2MoreThanA1');

        await Promise.all([
            page.waitForNavigation(),
            page.click('#captureModal button[type="submit"]')
        ]);

        expect(page.url()).toBe(`${BASE_URL}/mypokemon`);

        const successMessage = await page.$eval('.alert', el => el.textContent);
        expect(successMessage).toContain('Successfully captured Pokemon!');
    }, 20000);


    test('My Pokemon Page tests', async () => {
        await page.goto(`${BASE_URL}/mypokemon`);

        const isMyPokemonMenuActive = await page.$eval('a[href="/mypokemon"]', el => el.classList.contains('active'));
        expect(isMyPokemonMenuActive).toBe(true);

        await page.waitForSelector('.card');

        const pikachuCardHasPokemonNameAndTrainerNickname = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.card'));
            const card = cards.find(c => {
                const title = c.querySelector('.card-title');
                const subTitle = c.querySelector('p.text-muted');
                return title && title.textContent.trim() === 'iLoveMyAssignment2MoreThanA1' &&
                    subTitle && subTitle.textContent.trim().toLowerCase() === 'pikachu';
            });
            return !!card;
        });
        expect(pikachuCardHasPokemonNameAndTrainerNickname).toBe(true);

        const everyCardHasWeightAndHeightLabels = await page.$$eval('.card', cards => {
            return cards.every(card => {
                const strongElements = card.querySelectorAll('strong');
                return strongElements.length === 2 &&
                    strongElements[0].textContent.trim().length > 0 &&
                    strongElements[1].textContent.trim().length > 0 &&
                    (strongElements[0].textContent.trim() == "Weight" || strongElements[0].textContent.trim() == "Height")
                    ;
            });
        });
        expect(everyCardHasWeightAndHeightLabels).toBe(true);


        const everyCardHasWeightAndHeightValues = await page.$$eval('.card', cards => {
            return cards.every(card => {
                const weightElem = card.querySelector('.pokemon_weight');
                const heightElem = card.querySelector('.pokemon_height');

                if (!weightElem || !heightElem) return false;

                const weightText = weightElem.textContent.trim();
                const heightText = heightElem.textContent.trim();

                const oneDecimalRegex = /^\d+\.\d$/;
                return oneDecimalRegex.test(weightText) && oneDecimalRegex.test(heightText);
            });
        });
        expect(everyCardHasWeightAndHeightValues).toBe(true);

        const cardRenameBtnText = await page.$$eval('.card', cards => {
            return cards.every(card => {
                const capBtn = card.querySelector('.rename-button');
                return capBtn.textContent.trim() == "Rename"
            });
        });
        expect(cardRenameBtnText).toBe(true);


        const cardReleaseBtnText = await page.$$eval('.card', cards => {
            return cards.every(card => {
                const capBtn = card.querySelector('.release-button');
                return capBtn.textContent.trim() == "Release"
            });
        });
        expect(cardReleaseBtnText).toBe(true);

        await page.evaluate(() => document.querySelector('input[name="q"]').value = '');
        await page.type('input[name="q"]', 'pika');
        await Promise.all([
            page.waitForNavigation(),
            page.click('button[type="submit"]')
        ]);
        const searchCardCountPika = await page.$$eval('.card', cards => cards.length);
        console.log(searchCardCountPika)
        expect(searchCardCountPika).toBe(1);

        await page.evaluate(() => document.querySelector('input[name="q"]').value = '');
        await page.type('input[name="q"]', 'assi');
        await Promise.all([
            page.waitForNavigation(),
            page.click('button[type="submit"]')
        ]);
        const searchCardCountAssi = await page.$$eval('.card', cards => cards.length);
        expect(searchCardCountAssi).toBe(1);

    }, 90000);

    test('Renaming a pokemon', async () => {
        await page.goto(`${BASE_URL}/mypokemon`);

        const isMyPokemonMenuActive = await page.$eval('a[href="/mypokemon"]', el => el.classList.contains('active'));
        expect(isMyPokemonMenuActive).toBe(true);

        await page.waitForSelector('.card');

        const pikachuCard = await page.evaluateHandle(() => {
            const cards = Array.from(document.querySelectorAll('.card'));
            return cards.find(card => {
                const title = card.querySelector('.card-title');
                const subTitle = card.querySelector('p.text-muted');
                return title && title.textContent.trim() === 'iLoveMyAssignment2MoreThanA1' &&
                    subTitle && subTitle.textContent.trim().toLowerCase() === 'pikachu';
            });
        });

        const renameBtn = await pikachuCard.$('.rename-button');
        await renameBtn.click();

        await page.waitForSelector('#renameModal.show', { visible: true });

        const inputValue = await page.$eval('#renameModal input[name="name"]', el => el.value);
        expect(inputValue).toBe('iLoveMyAssignment2MoreThanA1');

        const inputField = await page.$('#renameModal input[name="name"]');
        await inputField.click({ clickCount: 3 });
        await inputField.press('Backspace');
        await inputField.type('Lemme cook rq');

        const putRequestPromise = new Promise(resolve => {
            page.on('request', interceptedRequest => {
                if (interceptedRequest.method() === 'PUT' && interceptedRequest.url().includes('/mypokemon/')) {
                    resolve(interceptedRequest);
                }
            });
        });

        await Promise.all([
            page.click('#renameForm button[type="submit"]'),
            putRequestPromise
        ]);

        await page.waitForNavigation();
        await page.waitForSelector('.card');

        const updatedPikachuCardHasNewName = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.card'));
            const card = cards.find(c => {
                const title = c.querySelector('.card-title');
                const subTitle = c.querySelector('p.text-muted');
                return title && title.textContent.trim() === 'Lemme cook rq' &&
                    subTitle && subTitle.textContent.trim().toLowerCase() === 'pikachu';
            });
            return !!card;
        });

        expect(updatedPikachuCardHasNewName).toBe(true);

        const successMessage = await page.$eval('.alert', el => el.textContent);
        expect(successMessage).toContain('Successfully renamed Pokemon!');
    }, 20000);



    test('Releasing a pokemon', async () => {
        await page.goto(`${BASE_URL}/mypokemon`);

        const isMyPokemonMenuActive = await page.$eval('a[href="/mypokemon"]', el => el.classList.contains('active'));
        expect(isMyPokemonMenuActive).toBe(true);

        await page.waitForSelector('.card');


        const pikachuCard = await page.evaluateHandle(() => {
            const cards = Array.from(document.querySelectorAll('.card'));
            return cards.find(card => {
                const subTitle = card.querySelector('p.text-muted');
                return subTitle && subTitle.textContent.trim().toLowerCase() === 'pikachu';
            });
        });

        const releaseBtn = await pikachuCard.$('.release-button');

        await releaseBtn.click();

        await page.waitForSelector('#releaseModal.show', { visible: true });

        const delRequestPromise = new Promise(resolve => {
            page.on('request', interceptedRequest => {
                if (interceptedRequest.method() === 'DELETE' && interceptedRequest.url().includes('/mypokemon/')) {
                    resolve(interceptedRequest);
                }
            });
        });

        await Promise.all([
            page.click('#releaseForm button[type="submit"]'),
            delRequestPromise
        ]);

        await page.waitForNavigation();

        const cardCount = await page.$$eval('.card', cards => cards.length);
        expect(cardCount).toBe(0);

        const successMessage = await page.$eval('.alert', el => el.textContent);
        expect(successMessage).toContain('Bye bye');
    }, 20000);


    test('Stats Page loads and renders chart', async () => {
        for (let i = 1; i <= 5; i++) {
            await page.goto(`${BASE_URL}/pokemon`);
            await page.waitForSelector('.card');

            const pikachuCard = await page.evaluateHandle(() => {
                const cards = Array.from(document.querySelectorAll('.card'));
                return cards.find(card => card.querySelector('.card-title').textContent.trim() === 'Pikachu');
            });

            const captureBtn = await pikachuCard.$('.capture-button');
            await captureBtn.click();

            await page.waitForSelector('#captureModal.show', { visible: true });

            await page.type('#nickname', `Pika ${i}`);

            await Promise.all([
                page.waitForNavigation(),
                page.click('#captureModal button[type="submit"]')
            ]);

            expect(page.url()).toBe(`${BASE_URL}/mypokemon`);
        }

        for (let i = 1; i <= 3; i++) {
            await page.goto(`${BASE_URL}/pokemon`);
            await page.waitForSelector('.card');

            const bulbaCard = await page.evaluateHandle(() => {
                const cards = Array.from(document.querySelectorAll('.card'));
                return cards.find(card => card.querySelector('.card-title').textContent.trim() === 'Bulbasaur');
            });

            const captureBtn = await bulbaCard.$('.capture-button');
            await captureBtn.click();

            await page.waitForSelector('#captureModal.show', { visible: true });

            await page.type('#nickname', `Bulb ${i}`);

            await Promise.all([
                page.waitForNavigation(),
                page.click('#captureModal button[type="submit"]')
            ]);

            expect(page.url()).toBe(`${BASE_URL}/mypokemon`);
        }


        for (let i = 1; i <= 2; i++) {
            await page.goto(`${BASE_URL}/pokemon`);
            await page.waitForSelector('.card');

            const mewCard = await page.evaluateHandle(() => {
                const cards = Array.from(document.querySelectorAll('.card'));
                return cards.find(card => card.querySelector('.card-title').textContent.trim() === 'Mew');
            });

            const captureBtn = await mewCard.$('.capture-button');
            await captureBtn.click();

            await page.waitForSelector('#captureModal.show', { visible: true });

            await page.type('#nickname', `Mew ${i}`);

            await Promise.all([
                page.waitForNavigation(),
                page.click('#captureModal button[type="submit"]')
            ]);

            expect(page.url()).toBe(`${BASE_URL}/mypokemon`);
        }

        await page.goto(`${BASE_URL}/stats`);

        const isStatsMenuActive = await page.$eval('a[href="/stats"]', el => el.classList.contains('active'));
        expect(isStatsMenuActive).toBe(true);

        await page.waitForSelector('#container .highcharts-root', { visible: true });

        const chartCount = await page.$$eval('#container .highcharts-root', charts => charts.length);
        expect(chartCount).toBe(1);
    }, 20000);
});
