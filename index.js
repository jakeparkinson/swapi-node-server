const express = require('express');
const cors = require('cors');
const axios = require('axios');
const _ = require('lodash');

const app = express();
const port = 3000;
const swapiPrefix = 'http://swapi.co/api';

app.use(cors());
app.set('view engine', 'ejs');

app.get('/character/:name', (req, res) => {
    const name = req.params.name;
    axios.get(`${swapiPrefix}/people/?search=${name}`)
        .then((response) => {
            const character = _.get(response, 'data.results[0]');
            res.render('character', {character});   
        })
        .catch((err) => {
            console.error(err);
        });
});

app.get('/characters', (req, res) => {
    const sort = _.get(req, 'query.sort', '');
    let promises = [];

    for (let i = 1; i < 6; i++) {
        promises.push(
            axios.get(`${swapiPrefix}/people/?page=${i}`)
                .then((response) => {
                    return _.get(response, 'data.results');
                })
        );
    }

    axios.all(promises)
        .then((resolved) => {
            let characters = _.flatten(resolved);
            if(sort) {
                characters = _.sortBy(characters, [
                    (o) => {
                        if(sort === 'name') {
                            return _.get(o, 'name');
                        }
                        else {
                            return _.parseInt(_.replace(_.get(o, sort), ',', ''));
                        }
                    }
                ]);
            }
            res.send(characters);
        });
});

app.get('/planetresidents', (req, res) => {
    axios.get(`${swapiPrefix}/planets`)
        .then((response) => {
            const planets = _.get(response, 'data.results');
            let planetPromises = planets.map((planet) => {
                let residentPromises = planet.residents.map((residentUrl) => {
                    return axios.get(residentUrl).then((residentResponse) => {
                        return _.get(residentResponse, 'data.name');
                    });
                });
                return axios.all(residentPromises).then((resolvedResidents) => {
                    return _.set({}, planet.name, resolvedResidents);
                });
            });
            return axios.all(planetPromises); 
        })
        .then((mappedPlanets) => {
            res.send(mappedPlanets);
        });
});

app.listen(port, () => {
    console.log(`Star wars api listening on port ${port}!`);
});

