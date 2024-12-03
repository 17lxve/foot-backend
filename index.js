const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// const connection_string = "mongodb+srv://kouadiobhegnino:SvG12light17@mydb.ajrc8va.mongodb.net/dlsi-foot"
const connection_string = "mongodb://localhost:27017/dlsi-foot"
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(connection_string, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.on('connection', (stream) => console.log('connected!'));

// Database Functions
const get = async (collection) => {
    const initial = await db.collection(collection).find();
    const result = initial.toArray();
    return result;
}
const getByAttribute = async (collection, attribute, attributeValue) => {
    const initial = await db.collection(collection).find({[attribute]: attributeValue});
    const result = initial.toArray();
    return result;
};

const create = async (collection, data) => await db.collection(collection).insertOne(data);
const createMany = async (collection, data) => await db.collection(collection).insertMany(data);

const update = async (collection, data) => await db.collection(collection).updateOne(filter={name: data.name}, data);
const deleteAll = async (collection, data) => await db.collection(collection).deleteMany({});

// Special Database Functions

const getAllGroups = async () => {
    const players = get("players");
    const groups = (await players).map((player) => player.poule)
    const uniqueArray = groups.filter((value, index) => groups.indexOf(value) === index);
    return uniqueArray;
}

const getMatchesByGroup = async (group) => await db.collection('matches').find({group});
const numberOfMatchesPerPlayer = async (player) => await db.collection('matches').countDocuments({$or: [{idplayer1: new mongoose.Types.ObjectId(player)}, {idplayer2: new mongoose.Types.ObjectId(player)}]});
const numberOfMatchesWonPerPlayer = async (player) => {
    const matches = await db.collection('matches').find({
        $or: [
            { idplayer1: new mongoose.Types.ObjectId(player), $expr: {$gt:[ "$score1", "$score2"]} },
            { idplayer2: new mongoose.Types.ObjectId(player), $expr: {$gt:[ "$score2", "$score1"]} }
        ]
    }).toArray();
    return matches.length;
};

const numberOfDrawsPerPlayer = async (player) => {
    const matches = await db.collection('matches').find({
        $or: [
            { idplayer1: new mongoose.Types.ObjectId(player), $expr: {$eq:[ "$score1", "$score2"]} },
            { idplayer2: new mongoose.Types.ObjectId(player), $expr: {$eq:[ "$score2", "$score1"]} }
        ]
    }).toArray();
    return matches.length;
};

const numberOfPointsPerPlayer = async(player) => {
    let wins = await numberOfMatchesWonPerPlayer(player)
    wins *= 3;
    const draws = await numberOfDrawsPerPlayer(player);
    const result = wins + draws;
    return result;
}

const seed = async () =>{
    await deleteAll('matches')
        const groups = await getAllGroups();
        const creation_task_result = groups.forEach( async group => {
            const current_group = await getByAttribute('players', 'poule', group);
            const created = createMany(
                'matches',
                [
                    {
                        idplayer1: current_group[0]._id,
                        idplayer2: current_group[1]._id,
                        player1: current_group[0].name,
                        player2: current_group[1].name,
                        score1: 0,
                        score2: 0,
                        group: group
                    },
                    {
                        idplayer1: current_group[2]._id,
                        idplayer2: current_group[3]._id,
                        player1: current_group[2].name,
                        player2: current_group[3].name,
                        score1: 0,
                        score2: 0,
                        group: group
                    },
                    {
                        idplayer1: current_group[0]._id,
                        idplayer2: current_group[3]._id,
                        player1: current_group[0].name,
                        player2: current_group[3].name,
                        score1: 0,
                        score2: 0,
                        group: group
                    },
                    {
                        idplayer1: current_group[1]._id,
                        idplayer2: current_group[2]._id,
                        player1: current_group[1].name,
                        player2: current_group[2].name,
                        score1: 0,
                        score2: 0,
                        group: group
                    },
                    {
                        idplayer1: current_group[0]._id,
                        idplayer2: current_group[2]._id,
                        player1: current_group[0].name,
                        player2: current_group[2].name,
                        score1: 0,
                        score2: 0,
                        group: group
                    },
                    {
                        idplayer1: current_group[1]._id,
                        idplayer2: current_group[3]._id,
                        player1: current_group[1].name,
                        player2: current_group[3].name,
                        score1: 0,
                        score2: 0,
                        group: group
                    },
                ]
            );
            return created;
        });
        return creation_task_result;
};

const top_group = async () => {
    const groups = await getAllGroups();
    const players = await get("players");

    // console.log(matches)
    const temp = await Promise.all(groups.map(async (group) => {
        const this_poule_players = players.filter((player) => player.poule == group);
        const scores = await Promise.all(this_poule_players.map(async (player) => await numberOfPointsPerPlayer(player._id)));
        const top_players = scores.slice().sort((a, b) => b - a).slice(0, 2);
        const first = this_poule_players[scores.indexOf(top_players[0])]
        const newArray = this_poule_players.filter((_, index) => index !== scores.indexOf(top_players[0]));
        const second = newArray[scores.indexOf(top_players[1])]
        const top_info = [first, second]        
        return {[group]: top_info};
    }));
    return temp
}

const buts_marqués = async (player) => {
    const played_matches1 = await db.collection('matches').find({
        idplayer1: new mongoose.Types.ObjectId(player)
    }).toArray();
    const played_matches2 = await db.collection('matches').find({
        idplayer2: new mongoose.Types.ObjectId(player)
    }).toArray();
    console.log(played_matches1)
    const goals1 = played_matches1.reduce((a,b) => a + b.score1, 0);
    const goals2 = played_matches2.reduce((a,b) => a + b.score2, 0);
    const goals = goals1 + goals2
    return goals;
}
const buts_encaissés = async (player) => {
    const played_matches1 = await db.collection('matches').find({
        idplayer1: new mongoose.Types.ObjectId(player)
    }).toArray();
    const played_matches2 = await db.collection('matches').find({
        idplayer2: new mongoose.Types.ObjectId(player)
    }).toArray();
    const goals1 = played_matches1.reduce((a,b) => a + b.score2, 0);
    const goals2 = played_matches2.reduce((a,b) => a + b.score1, 0);
    const goals = goals1 + goals2
    return goals;
}

const playersWithScore = async () => {
    const players = await get("players");
    await Promise.all(players.map(async (player) => {
        player.matchs_joués = await numberOfMatchesPerPlayer(player._id);
        player.victoires = await numberOfMatchesWonPerPlayer(player._id);
        player.nuls = await numberOfDrawsPerPlayer(player._id);
        player.défaites = player.matchs_joués - (player.victoires + player.nuls);
        player.buts_marqués = await buts_marqués(player._id);
        player.buts_encaissés = await buts_encaissés(player._id);
        player.goal_différentiel = player.buts_marqués - player.buts_encaissés; 
        player.points = await numberOfPointsPerPlayer(player._id);
        delete player.goals;
        delete player.matches;
        delete player._id;
        delete player.club;
        delete player.direction;
    }));
    players.sort((a, b) => b.score - a.score)
    return players;
}

// Define routes
app.get('/api/players', async (req, res) => {
    const result = await get("players");
    res.send({ data: result });
});

app.get('/api/scored/:id', async (req, res) => {
    const result = await buts_marqués(req.params.id);
    res.send({ data: result })
});

app.get('/api/matches/:id/count', async (req, res) => res.send({ data: await numberOfMatchesPerPlayer(req.params.id)}));

app.get('/api/matches', async (req, res) => {
    const result = await get("matches");
    res.send({ data: result });
});
app.get('/api/matches/:id/victories', async (req, res) => {
    const result = await numberOfMatchesWonPerPlayer(req.params.id);
    res.send({ data: result });
});
app.get('/api/matches/:id/draws', async (req, res) => {
    const result = await numberOfDrawsPerPlayer(req.params.id);
    res.send({ data: result });
});

app.get('/api/matches/:id/points', async (req, res) => {
    const result = await numberOfPointsPerPlayer(req.params.id);
    res.send({ data: result });
});

app.get('/api/groups', async (req, res) => {
    const groups = await getAllGroups();
    res.send({ data: groups });
});

app.get('/api/top-poules', async (req, res) => {
    const result = await top_group();
    res.send({ data: result });
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

app.get('/api', async (req, res) => {
    const result = await seed();
    res.send({ data: result });
});

app.get('/api/scores', async (req, res) => {
    const result = await playersWithScore();
    res.send({ data: result })
})