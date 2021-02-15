var levenshtein = require('fast-levenshtein');

const fs = require('fs')

//--------------------------------------------

const pathApp = './config/app.coins.json'
const pathCg = './config/coingecko.coins.json'
const pathCc = './config/cryptocompare.coins.json'
const pathPr = './config/provider.coins.json'

const appFile = readFile(pathApp)
const cgFile = readFile(pathCg)
const ccFile = readFile(pathCc)

const jsonCg = JSON.parse(cgFile)
const cgCoins = jsonCg

const jsonCc = JSON.parse(ccFile)
const ccCoins = jsonCc

//--------------------------------------------
function isNullOrEmpty(value){
    if(value){
        return true
    }
    else
        return false
}
async function saveFile(path, data) {
    fs.writeFileSync(path, data)
}

function readFile(path) {
    return fs.readFileSync(path)
}

//--------------------------------------------
function getPlatformInfo(cgCoin){
    if(cgCoin.platforms){
        if(Object.keys(cgCoin.platforms).length > 0){
            const platformName = Object.entries(cgCoin.platforms)[0][0]
            const platformValue = Object.entries(cgCoin.platforms)[0][1]

            if(platformValue){
                if(platformName === 'binancecoin'){
                    return { platform:'binance', address: platformValue, coinId: `bnb|${platformValue}`}
                }
                else if(platformName === 'ethereum'){
                    return { platform:'ethereum', address: platformValue, coinId: `erc20|${platformValue}`}
                }
            }
        }
    }

    return { platform:'',  address:'', coinId: cgCoin.id}
}
//--------------------------------------------
function generateId(cgCoin){
    if(cgCoin.name.toLowerCase() === "bitcoin" )
        return { platform:'', address:'', coinId: "bitcoin"}
    else if(cgCoin.name.toLowerCase() === "ethereum" )
        return { platform:'', address:'', coinId: "ethereum"}
    else if(cgCoin.name.toLowerCase() === "binance coin" )
        return { platform:'', address:'', coinId: "binance"}
    else if(cgCoin.name.toLowerCase() === "zcash" )
        return { platform:'', address:'', coinId: "zcash"}
    else if(cgCoin.name.toLowerCase() === "litecoin" )
        return { platform:'', address:'', coinId: "litecoin"}
    else if(cgCoin.name.toLowerCase() === "dash" )
        return { platform:'', address:'', coinId: "dash"}
    else if(cgCoin.name.toLowerCase() === "bitcoin cash" )
        return { platform:'', address:'' , coinId: "bitcoin-cash"}
    else
        return getPlatformInfo(cgCoin)
}

//--------------------------------------------

function mergeCoinGeckoCoins(){
    const newCoins = []

    for(const cgCoin of cgCoins){
        const platform = generateId(cgCoin)
        const coinId = platform.coinId

        newCoins.push({
            id : coinId,
            code : cgCoin.symbol,
            name : cgCoin.name,
            platform : platform.address,
            external_id: {
                coingecko: cgCoin.id,
            }
        })
    }

    saveFile(pathPr, JSON.stringify({coins : newCoins}))
}

//--------------------------------------------
function compareStrings(str1, str2){

    if(!str1 || !str2)
        return 0

    const maxLength = Math.max(str1.length, str2.length)
    const distance = levenshtein.get(str1, str2);
    const ratio = 100 - Number.parseFloat(distance * 100/maxLength)
    return ratio
}
//--------------------------------------------

function mergeCryptoCompareCoinsBySmartContract(prCoins, foundCcCoins){
        //  --- Merge coins with Uniq address ------------
        const hasSmartContractCc = foundCcCoins.filter(ccCoin =>
            ccCoin.SmartContractAddress
        )

        const hasSmartContractPr = prCoins.filter(prCoin =>
            prCoin.platform
        )

        const uniqAddressCoinsCc = []
        const uniqAddressCoinsPr = []

        for(let prCoin of hasSmartContractPr){

            const found = hasSmartContractCc.filter(ccCoin =>
                ccCoin.SmartContractAddress.trim().toLowerCase() == prCoin.platform.trim().toLowerCase()
            )

            if(found.length > 0){

                if(found.length > 1){
                    found.forEach(f => {
                        if(f.Symbol == 'FTT' || f.Symbol == 'WABI' ||  f.Symbol == 'RDN' ){
                            prCoin.external_id['cryptocompare'] = f.Symbol
                            //prCoin.description = f.Description
                            uniqAddressCoinsCc.push(f)
                        }
                    })
                } else {
                    prCoin.external_id['cryptocompare'] = found[0].Symbol
                    //prCoin.description = found[0].Description
                    uniqAddressCoinsCc.push(found[0])
                }
                uniqAddressCoinsPr.push(prCoin)
            }
        }
        prCoins = prCoins.filter(pr => uniqAddressCoinsPr.indexOf(pr) === -1 )
        foundCcCoins = foundCcCoins.filter(cc => uniqAddressCoinsCc.indexOf(cc) === -1 )
        console.log(`Merged UniqAddress Coins: ${uniqAddressCoinsPr.length}`)

        return {outCoins: uniqAddressCoinsPr, prCoins, foundCcCoins  }
}
//--------------------------------------------
function mergeCryptoCompareCoinsByCodeName(prCoins, foundCcCoins){
        //  --- Merge coins with Code/Name ------------
        const uniqCodesCoinsCc = []
        const uniqCodesCoinsPr = []

        for(let prCoin of prCoins){

            const found = foundCcCoins.filter(ccCoin =>
                ccCoin.Symbol.trim().toLowerCase() == prCoin.code.trim().toLowerCase()
                && ( ccCoin.CoinName.trim().toLowerCase() == prCoin.name.trim().toLowerCase())
            )

            if(found.length > 0){
                prCoin.external_id['cryptocompare'] = found[0].Symbol
                //prCoin.description = found[0].Description
                uniqCodesCoinsCc.push(found[0])
                uniqCodesCoinsPr.push(prCoin)
            }
        }

        prCoins = prCoins.filter(pr => uniqCodesCoinsPr.indexOf(pr) === -1 )
        foundCcCoins = foundCcCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
        console.log(`Merged UniqCodes and Name Coins: ${uniqCodesCoinsPr.length}`)

        return {outCoins: uniqCodesCoinsPr, prCoins, foundCcCoins  }
}
//--------------------------------------------
function mergeCryptoCompareCoinsByNameIdenticRatio(prCoins, foundCcCoins){
    //  --- Merge coins with Code likely name ------------
    const uniqCodesCoinsCc = []
    const uniqCodesCoinsPr = []

    for(let prCoin of prCoins){

        const found = foundCcCoins.filter(ccCoin =>
            ccCoin.Symbol.trim().toLowerCase() == prCoin.code.trim().toLowerCase()
            && 50 <= compareStrings(ccCoin.CoinName.trim().toLowerCase(), prCoin.name.trim().toLowerCase())
        )

        if(found.length > 0){
            prCoin.external_id['cryptocompare'] = found[0].Symbol
            //prCoin.description = found[0].Description
            //console.log(found[0].CoinName, '-', prCoin.name)
            uniqCodesCoinsCc.push(found[0])
            uniqCodesCoinsPr.push(prCoin)
        }
    }
    prCoins = prCoins.filter(pr => uniqCodesCoinsPr.indexOf(pr) === -1 )
    foundCcCoins = foundCcCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
    console.log(`Merged Name identic ration Coins: ${uniqCodesCoinsPr.length}`)

    return {outCoins: uniqCodesCoinsPr, prCoins, foundCcCoins  }
}

//--------------------------------------------

function mergeCryptoCompareCoins(){
    const providerFile = readFile(pathPr)
    const jsonPr = JSON.parse(providerFile)
    let prCoins = jsonPr.coins
    let foundCcCoins = Object.values(ccCoins.Data)

    //  --- Merge coins with Uniq address ------------
    let out = mergeCryptoCompareCoinsBySmartContract(prCoins, foundCcCoins)
    prCoins = out.prCoins
    foundCcCoins = out.foundCcCoins
    let outCoins = out.outCoins

    //  --- Merge coins with Code/Name ------------
    out = mergeCryptoCompareCoinsByCodeName(prCoins, foundCcCoins)
    prCoins = out.prCoins
    foundCcCoins = out.foundCcCoins
    outCoins = [].concat(outCoins, out.outCoins)

    //  --- Merge coins with Code and Name  ------------
    out = mergeCryptoCompareCoinsByNameIdenticRatio(prCoins, foundCcCoins)
    prCoins = out.prCoins
    foundCcCoins = out.foundCcCoins
    outCoins = [].concat(outCoins, out.outCoins)

    console.log(prCoins.length, foundCcCoins.length)

    //saveFile(pathPr, JSON.stringify({coins : outCoins}))
}

//--------------------------------------------
function mergeAppCoins(){

    const str1 = 'backddddd3'
    const str2 = 'back123123'

    var distance = levenshtein.get(str1, str2);
    console.log(`Compare:${str1}-${str1.length} ${str2}-${str2.length}, D:${distance}`)

}

//--------------------------------------------
function findIdenticalCoinIds(){

    const providerFile = readFile(pathPr)
    const jsonPr = JSON.parse(providerFile)
    const prCoins = jsonPr.coins

    for(const prCoin of prCoins){
        const found = prCoins.filter(pr =>
            pr.code.toLowerCase() === prCoin.code.toLowerCase()
        )
        if(found.length > 1)
            console.log(found)
    }
}

//--------------------------------------------

//mergeCoinGeckoCoins()
mergeCryptoCompareCoins()
//mergeAppCoins()
