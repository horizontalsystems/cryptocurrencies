var levenshtein = require('fast-levenshtein');

const fs = require('fs')

//--------------------------------------------

const pathCoinCat = './config/coins.categories.json'
const pathCg = './config/coingecko.coins.json'
const pathCc = './config/cryptocompare.coins.json'
const pathPr = './config/provider.coins.json'
const pathAppCoins = './config/app.coins.json'

const coinCatFile = readFile(pathCoinCat)
const cgFile = readFile(pathCg)
const ccFile = readFile(pathCc)

const jsonCg = JSON.parse(cgFile)
const cgCoins = jsonCg

const jsonCc = JSON.parse(ccFile)
const ccCoins = jsonCc

let mergedCoinsList = []

//--------------------------------------------
function sortByProperty(property) {
    return (a, b) => {
        if (a[property] > b[property]) return 1
        if (a[property] < b[property]) return -1

        return 0
    }
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
                    return { platform:'binance', platformType:'bep2', address: platformValue, coinId: `bep2|${platformValue}`}
                }
                else if(platformName === 'ethereum'){
                    return { platform:'ethereum', platformType:'erc20', address: platformValue, coinId: `erc20|${platformValue}`}
                }
                else if(platformName === 'binance-smart-chain'){
                    return { platform:'binance-smart-chain', platformType:'bep20', address: platformValue, coinId: `bep20|${platformValue}`}
                }
                else{
                    return { platform:platformName, platformType:'', address: platformValue, coinId: `${platformName}|${platformValue}`}
                }
            }
        }
    }

    return { platform:'',  address:'', coinId: cgCoin.id}
}
//--------------------------------------------
function generateId(cgCoin){
    if(cgCoin.name.toLowerCase() === "bitcoin" )
        return { platform:'', platformType:'', address:'', coinId: "bitcoin"}
    else if(cgCoin.name.toLowerCase() === "ethereum" )
        return { platform:'', platformType:'', address:'', coinId: "ethereum"}
    else if(cgCoin.name.toLowerCase() === "binance coin" )
        return { platform:'', platformType:'', address:'', coinId: "binance"}
    else if(cgCoin.name.toLowerCase() === "zcash" )
        return { platform:'', platformType:'', address:'', coinId: "zcash"}
    else if(cgCoin.name.toLowerCase() === "litecoin" )
        return { platform:'', platformType:'', address:'', coinId: "litecoin"}
    else if(cgCoin.name.toLowerCase() === "dash" )
        return { platform:'', platformType:'', address:'', coinId: "dash"}
    else if(cgCoin.name.toLowerCase() === "bitcoin cash" )
        return { platform:'', platformType:'', address:'' , coinId: "bitcoin-cash"}
    else
        return getPlatformInfo(cgCoin)
}

//--------------------------------------------

function mergeCoinGeckoCoins(){
    const newCoins = []

    for(const cgCoin of cgCoins){
        const platform = generateId(cgCoin)
        const coinId = platform.coinId
        const platfromJson = { name: platform.platform, address: platform.address, type: platform.platformType }

        if(platform.platform){
            newCoins.push({
                id : coinId,
                code : cgCoin.symbol,
                name : cgCoin.name,
                platform : platfromJson,
                external_id: {
                    coingecko: cgCoin.id,
                }
            })
        } else {
            newCoins.push({
                id : coinId,
                code : cgCoin.symbol,
                name : cgCoin.name,
                external_id: {
                    coingecko: cgCoin.id,
                }
            })
        }
    }

    saveFile(pathAppCoins, JSON.stringify({coins : newCoins}))
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
function addCryptoCompareSmartContractData(appCoin, ccCoin){

    let newAppCoin = appCoin

    if(ccCoin.SmartContractAddress){
        let platformName = ''
        let platformType = ''

        if(ccCoin.BuiltOn == 'ETH'){
            platformName = 'ethereum'
            platformType = 'erc20'
        } else if(ccCoin.BuiltOn == 'TRX'){
            platformName = 'tron'
            platformType = 'tron'
        } else if(ccCoin.BuiltOn == 'BNB'){
            platformName = 'binance'
            platformType = 'bep2'
        }
        newAppCoin.id = `${platformType}|${ccCoin.SmartContractAddress}`
        newAppCoin.platform = { name: platformName, address: ccCoin.SmartContractAddress, type: platformType }
    }

    return newAppCoin
}
//--------------------------------------------

function mergeCryptoCompareCoinsBySmartContract(appCoins, foundCcCoins){
        //  --- Merge coins with Uniq address ------------
        const hasSmartContractCc = foundCcCoins.filter(ccCoin =>
            ccCoin.SmartContractAddress
        )

        const hasSmartContractAppCoins = appCoins.filter(appCoin =>
            appCoin.platform
        )

        const uniqAddressCoinsCc = []
        const uniqAddressCoinsApp = []
        let mergedIndex = 0
        mergedCoinsList.push('*********  Merged By SmartContract (100%) ******************* ')

        for(const appCoin of hasSmartContractAppCoins){

            const found = hasSmartContractCc.filter(ccCoin =>
                ccCoin.SmartContractAddress.trim().toLowerCase() == appCoin.platform.address.trim().toLowerCase()
            )

            if(found.length > 0){

                if(found.length > 1){
                    found.forEach(f => {
                        if(f.Symbol == 'FTT' || f.Symbol == 'WABI' ||  f.Symbol == 'RDN' ){
                            appCoin.external_id['cryptocompare'] = f.Symbol
                            appCoin.description = f.Description
                            uniqAddressCoinsCc.push(f)
                            mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${f.Symbol}-${f.CoinName}`)
                        }
                    })
                } else {
                    appCoin.external_id['cryptocompare'] = found[0].Symbol
                    appCoin.description = found[0].Description
                    uniqAddressCoinsCc.push(found[0])
                }
                uniqAddressCoinsApp.push(appCoin)
                mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${found[0].Symbol}-${found[0].CoinName}`)
            }
        }
        appCoins = appCoins.filter(appC => uniqAddressCoinsApp.indexOf(appC) === -1 )
        foundCcCoins = foundCcCoins.filter(cc => uniqAddressCoinsCc.indexOf(cc) === -1 )
        console.log(`Merged UniqAddress Coins: ${uniqAddressCoinsApp.length}`)

        return {outCoins: uniqAddressCoinsApp, appCoins: appCoins, foundCcCoins  }
}
//--------------------------------------------
function mergeCryptoCompareCoinsByCodeName(appCoins, foundCcCoins){
        //  --- Merge coins with Code/Name ------------
        const uniqCodesCoinsCc = []
        const uniqCodesCoinsApp = []
        let mergedIndex = mergedCoinsList.length
        mergedCoinsList.push('*********  Merged By Code/Name (100%) ******************* ')

        for(let appCoin of appCoins){

            const found = foundCcCoins.filter(ccCoin =>
                ccCoin.Symbol.trim().toLowerCase() == appCoin.code.trim().toLowerCase()
                && ( ccCoin.CoinName.trim().toLowerCase() == appCoin.name.trim().toLowerCase())
            )

            if(found.length > 0){
                appCoin.external_id['cryptocompare'] = found[0].Symbol
                appCoin.description = found[0].Description

                if(!appCoin.platform && found[0].SmartContractAddress){
                    appCoin = addCryptoCompareSmartContractData(appCoin, found[0])
                }

                uniqCodesCoinsCc.push(found[0])
                uniqCodesCoinsApp.push(appCoin)
                mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${found[0].Symbol}-${found[0].CoinName}`)
            }
        }

        appCoins = appCoins.filter(appC => uniqCodesCoinsApp.indexOf(appC) === -1 )
        foundCcCoins = foundCcCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
        console.log(`Merged UniqCodes and Name Coins: ${uniqCodesCoinsApp.length}`)

        return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundCcCoins  }
}

//--------------------------------------------
function mergeCryptoCompareCoinsByNameIdenticRatio(appCoins, foundCcCoins){
    //  --- Merge coins with Code likely name ------------
    const uniqCodesCoinsCc = []
    const uniqCodesCoinsApp = []
    let mergedIndex = mergedCoinsList.length
    mergedCoinsList.push('*********  Merged By Code(100%)  Name (50%) ******************* ')

    for(let appCoin of appCoins){

        const found = foundCcCoins.filter(ccCoin =>
            ccCoin.Symbol.trim().toLowerCase() == appCoin.code.trim().toLowerCase()
            && 50 <= compareStrings(ccCoin.CoinName.trim().toLowerCase(), appCoin.name.trim().toLowerCase())
        )

        if(found.length > 0){
            appCoin.external_id['cryptocompare'] = found[0].Symbol
            appCoin.description = found[0].Description
            //console.log(found[0].CoinName, '-', appCoin.name)
            uniqCodesCoinsCc.push(found[0])
            uniqCodesCoinsApp.push(appCoin)
            mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${found[0].Symbol}-${found[0].CoinName}`)
        }
    }
    appCoins = appCoins.filter(appC => uniqCodesCoinsApp.indexOf(appC) === -1 )
    foundCcCoins = foundCcCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
    console.log(`Merged Name identic ratio Coins: ${uniqCodesCoinsApp.length}`)

    return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundCcCoins  }
}

//--------------------------------------------
function mergeCryptoCompareCoinsByCodeIdenticRatio(appCoins, foundCcCoins){
    //  --- Merge coins with Code likely name ------------
    const uniqCodesCoinsCc = []
    const uniqCodesCoinsApp = []
    let mergedIndex = mergedCoinsList.length
    mergedCoinsList.push('*********  Merged By Code(80%) ******************* ')

    for(let appCoin of appCoins){

        const found = foundCcCoins.filter(ccCoin =>
            85 <= compareStrings(ccCoin.Symbol.trim().toLowerCase(), appCoin.code.trim().toLowerCase())
        )

        if(found.length > 0){
            appCoin.external_id['cryptocompare'] = found[0].Symbol
            appCoin.description = found[0].Description
            //console.log(found[0].CoinName, '-', appCoin.name)
            uniqCodesCoinsCc.push(found[0])
            uniqCodesCoinsApp.push(appCoin)
            mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${found[0].Symbol}-${found[0].CoinName}`)
        }
    }
    appCoins = appCoins.filter(appC => uniqCodesCoinsApp.indexOf(appC) === -1 )
    foundCcCoins = foundCcCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
    console.log(`Merged Code identic ratio Coins: ${uniqCodesCoinsApp.length}`)

    return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundCcCoins  }
}
//--------------------------------------------

function mergeCryptoCompareCoins(){
    const appCoinsFile = readFile(pathAppCoins)
    const jsonAppCoins = JSON.parse(appCoinsFile)
    let appCoins = jsonAppCoins.coins
    let foundCcCoins = Object.values(ccCoins.Data)

    //  --- Merge coins with Uniq address ------------
    let out = mergeCryptoCompareCoinsBySmartContract(appCoins, foundCcCoins)
    appCoins = out.appCoins
    foundCcCoins = out.foundCcCoins
    let outCoins = out.outCoins

    //  --- Merge coins with Code/Name ------------
    out = mergeCryptoCompareCoinsByCodeName(appCoins, foundCcCoins)
    appCoins = out.appCoins
    foundCcCoins = out.foundCcCoins
    outCoins = [].concat(outCoins, out.outCoins)

    //  --- Merge coins with  Name  Identic ------------
    out = mergeCryptoCompareCoinsByNameIdenticRatio(appCoins, foundCcCoins)
    appCoins = out.appCoins
    foundCcCoins = out.foundCcCoins
    outCoins =  [].concat(outCoins, out.outCoins)

    //  --- Merge coins with Code Identic  ------------
    out = mergeCryptoCompareCoinsByCodeIdenticRatio(appCoins, foundCcCoins)
    appCoins = out.appCoins
    foundCcCoins = out.foundCcCoins
    outCoins =  ([].concat(outCoins, out.outCoins)).sort(sortByProperty('code'))

    console.log('Found items:')
    console.log('CoinGecko', appCoins.length, 'CryptoCompare:', foundCcCoins.length)

    const outProviderCoins = outCoins
    outProviderCoins.forEach(outCoin => {
        delete outCoin['description']
        delete outCoin['platform']
        delete outCoin['code']
        delete outCoin['name']
    })
    saveFile(pathPr, JSON.stringify({coins : outProviderCoins}))
    saveFile('./config/merged.json', JSON.stringify(mergedCoinsList))

    //--------------------------------------------
    getNotMergedCoins(appCoins, foundCcCoins)
}

//--------------------------------------------
function getNotMergedCoins(appCoins, foundCcCoins){
    mergedCoinsList = []
    appCoins = appCoins.sort(sortByProperty(`code`))
    foundCcCoins = foundCcCoins.sort(sortByProperty('Symbol'))

    let mergedIndex = mergedCoinsList.length

    for(const appCoin of appCoins){
        const appCoinData = `${appCoin.code}-${appCoin.name}`
        const ccCoinData = foundCcCoins[mergedIndex] ? `${foundCcCoins[mergedIndex].Symbol}-${foundCcCoins[mergedIndex].CoinName}` : ''
        mergedCoinsList.push(`${++mergedIndex} - ${appCoinData} --- ${ccCoinData}`)
    }
    saveFile('./config/notmerged.json', JSON.stringify(mergedCoinsList))

}
//--------------------------------------------

function mergeAppCoins(){

}
//--------------------------------------------

mergeCoinGeckoCoins()
mergeCryptoCompareCoins()
//mergeAppCoins()
