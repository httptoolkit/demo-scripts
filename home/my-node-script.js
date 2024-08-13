const pokemonListResponse = await fetch('https://pokeapi.co/api/v2/pokemon/');

if (!pokemonListResponse.ok) throw new Error(`Unexpected ${pokemonListResponse.status} response`);

const pokemon = (await pokemonListResponse.json()).results;

for (let p of pokemon) {
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log('Loading', p.name);
    const detailsResponse = await fetch(p.url);
    if (!detailsResponse.ok) {
        console.error(`\n!!! Unexpected ${detailsResponse.status} response loading data for ${p.name} !!!\n`);
        process.exit(1);
    }
    await detailsResponse.json();
}
