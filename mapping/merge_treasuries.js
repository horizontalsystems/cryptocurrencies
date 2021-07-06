const axios = require('axios');
const fs = require('fs')


const pathCoinsTreasure = './config/treasure.json'
const pathCoinsTreasureOut = './config/treasure_out.json'

const fileCoinsTreasure = readFile(pathCoinsTreasure)

const jsonCt = JSON.parse(fileCoinsTreasure)
const coinTreasuries = jsonCt

//--------------------------------------------

async function saveFile(path, data) {
    fs.writeFileSync(path, data)
}

function readFile(path) {
    return fs.readFileSync(path)
}

//--------------------------------------------

function updateCoinTreasuries(){
    const newTreasuries = []

    for(const coinTr of coinTreasuries){

        const data = []
        const companyId = coinTr.company
            .replace(/\./g,'')
            .replace(/,/g,'')
            .replace(/\//g,'')
            .replace(/  /g,' ')
            .replace(/ /g,'_')
            .toLowerCase()

        let amount = 0.0

        if(isNaN(coinTr.amount))
            amount = Number.parseFloat(coinTr.amount.replace(/,/g,''))
        else
            amount = Number.parseFloat(coinTr.amount)

        amount = amount * 1000000000

        data.push({bitcoin: {amount: amount}})

        newTreasuries.push({
            company : {
                id: companyId,
                name: coinTr.company,
                select: coinTr.select,
                country: coinTr.country
            },
            data: data
        })
    }

    saveFile(pathCoinsTreasureOut, JSON.stringify({treasuries: newTreasuries}))
}


updateCoinTreasuries()