'use strict';

var Twitter = require('twitter'),
    request = require('request'),
    moment = require('moment');


var client = new Twitter({
    consumer_key: process.env.consumer_key,
    consumer_secret: process.env.consumer_secret,
    access_token_key: process.env.access_token_key,
    access_token_secret: process.env.access_token_secret
});


var capacity = 10560; // 10.56 kW
var eid = '9337259'; // entityId from the auroravision URL


var wows = ['Wow', 'Blimey', 'Yikes', 'Yippee', 'Yay', 'Hooray', 'Three cheers', 'What a day'];
var wow_adjectives = ['a great big', 'a whopping', 'a huge', 'an enormous', 'an impressive', 'a super', 'a whole'];
var mehs = ['Can’t complain, I suppose.', 'Not bad.'];
var meh_adjectives = ['decent', 'pretty good', 'quite good'];
var verbs = ['generated', 'generated', 'made', 'made', 'produced', 'produced', 'managed'];


function pickRandom(from) {
    return from[Math.floor(Math.random() * from.length)];
}

function tweet(text) {
    console.log('Tweeting…');
    client.post('statuses/update', {
        status: text,
        lat: 51.770977,
        long: -1.255263,
    }, function () {
        console.log('Tweeted');
    });
}

function getCookies(then) {
    request.get({
        url: 'https://easyview.auroravision.net/easyview/?entityId=' + eid,
        jar: true
    }, then);
}

function getKilowattHours(then) {
    var url = 'https://easyview.auroravision.net/easyview/services/gmi/summary/GenerationEnergy.json',
        today = moment();
    url += '?type=GenerationEnergy&eids=' + eid + '&start=' + today.format('YYYYMMDD') + '&end=' + today.add(1, 'd').format('YYYYMMDD');
    request.get({
        url: url,
        json: true,
        jar: true  // cookies
    }, function (error, response, body) {
        then(body.fields[1].values[0].value);
    });
}

function getSparklineFromNumbers(numbers) {
    var i,
        number,
        sparkline = '';
    for (var i in numbers) {
        number = numbers[i] / (capacity * 4);
        if (number > .875) {
            sparkline += '█';
        } else if (number > .75) {
            sparkline += '▇';
        } else if (number > .625) {
            sparkline += '▆';
        } else if (number > .5) {
            sparkline += '▅';
        } else if (number > .375) {
            sparkline += '▄';
        } else if (number > .25) {
            sparkline += '▃';
        } else if (number > .125) {
            sparkline += '▂';
        } else {
            sparkline += '▁';
        }
    }
    return sparkline;
}

function getSparkline(then) {
    var url = 'https://easyview.auroravision.net/easyview/services/gmi/summary.json',
        today = moment();
    url += '?fields=GenerationPower&eids=' + eid + '&start=' + today.format('YYYYMMDD') + '&end=' + today.add(1, 'd').format('YYYYMMDD');
    request.get({
        url: url,
        json: true,
        jar: true
    }, function (error, response, body) {
        var hours = {
            0: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            7: 0,
            8: 0,
            9: 0,
            10: 0,
            11: 0,
            12: 0,
            13: 0,
            14: 0,
            15: 0,
            16: 0,
            17: 0,
            18: 0,
            19: 0,
            20: 0,
            21: 0,
            22: 0,
            23: 0,
            24: 0,
        };
        body.fields[1].values.forEach(function (value) {
            var hour = parseInt(value.startLabel.substr(8, 2));
            // if (hour % 2 === 0) {
            //     hour -= 1;
            // }
            // console.log(value.value);
            hours[hour] += parseInt(value.value);
        });
        return then(getSparklineFromNumbers(hours));
    });
}

function getTweetText(kilowattHours) {
    var wow,
        meh,
        adjective,
        verb = pickRandom(verbs);
    if (kilowattHours > 50) {
        wow = pickRandom(wows);
        adjective = pickRandom(wow_adjectives);
        return pickRandom([
            wow + ', today I ' + verb + ' ' + adjective + ' ' + kilowattHours + ' kWh',
            wow + ', I '       + verb + ' ' + adjective + ' ' + kilowattHours + ' kWh today',
        ]) + ' ' + pickRandom(['☀', '🌞']);
    }
    if (kilowattHours > 35) {
        meh = pickRandom(mehs);
        adjective = pickRandom(meh_adjectives);
        return pickRandom([
            'Today I ' + verb + ' a ' + adjective + ' ' + kilowattHours + ' kWh. ' + meh,
            'I '       + verb + ' a ' + adjective + ' ' + kilowattHours + ' kWh today. ' + meh,
        ]) + ' ' + pickRandom(['⛅', '🌥']);
    }
    return pickRandom([
        'Today I '               + verb + ' '       + kilowattHours + ' kWh. ',
        'Today I '               + verb + ' only  ' + kilowattHours + ' kWh. ',
        'Oh dear, today I only ' + verb + ' '       + kilowattHours + ' kWh. ',
        'I '                     + verb + ' '       + kilowattHours + ' kWh today. ',
        'I '                     + verb + ' '       + kilowattHours + ' kWh today. ',
        'I only '                + verb + ' '       + kilowattHours + ' kWh today. ',
    ]) + '☁️' + pickRandom([' Maybe it will be sunnier tomorrow.', ' Must have been cloudy.', ' I tried my best.', '']);
}

exports.handler = function () {
    getCookies(function() {
        getKilowattHours(function (kilowattHours) {
            var text = getTweetText(kilowattHours);
            getSparkline(function(sparkline) {
                text += '\n' + sparkline;
                // console.log(text);
                tweet(text);
            });
        });
    });
};
