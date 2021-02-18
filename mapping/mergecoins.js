var levenshtein = require('fast-levenshtein');

const fs = require('fs')

//--------------------------------------------

const pathCoinCategories = './config/coins.categories.json'
const pathCoinGeckoCoins = './config/coingecko.coins.json'
const pathCryptocomCoins = './config/cryptocompare.coins.json'
const pathProviderIds = './config/provider.coins.json'
const pathAppCoins = './config/app.coins.json'
const pathMergedCoins = './config/merged.json'
const pathNotMergedCryptocomCoins = './config/notmerged_cryptocom.json'
const pathNotMergedCoinGeckoCoins = './config/notmerged_coingecko.json'

const fileAppCoins = readFile(pathAppCoins)
const fileCoinsCategory = readFile(pathCoinCategories)
const fileCoinGeckoCoins = readFile(pathCoinGeckoCoins)
const fileCryptocomCoins = readFile(pathCryptocomCoins)

const jsonCg = JSON.parse(fileCoinGeckoCoins)
const coinGeckoCoins = jsonCg

const jsonCc = JSON.parse(fileCryptocomCoins)
const cryptocomCoins = jsonCc

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
function getPlatformInfo(coinGeckoCoin){
    if(coinGeckoCoin.platforms){
        if(Object.keys(coinGeckoCoin.platforms).length > 0){
            const platformName = Object.entries(coinGeckoCoin.platforms)[0][0]
            const platformValue = Object.entries(coinGeckoCoin.platforms)[0][1]

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

    return { platform:'',  address:'', coinId: coinGeckoCoin.id}
}
//--------------------------------------------
function generateId(coinGeckoCoin){
    if(coinGeckoCoin.name.toLowerCase() === "bitcoin" )
        return { platform:'', platformType:'', address:'', coinId: "bitcoin"}
    else if(coinGeckoCoin.name.toLowerCase() === "ethereum" )
        return { platform:'', platformType:'', address:'', coinId: "ethereum"}
    else if(coinGeckoCoin.name.toLowerCase() === "binance coin" )
        return { platform:'', platformType:'', address:'', coinId: "binance"}
    else if(coinGeckoCoin.name.toLowerCase() === "zcash" )
        return { platform:'', platformType:'', address:'', coinId: "zcash"}
    else if(coinGeckoCoin.name.toLowerCase() === "litecoin" )
        return { platform:'', platformType:'', address:'', coinId: "litecoin"}
    else if(coinGeckoCoin.name.toLowerCase() === "dash" )
        return { platform:'', platformType:'', address:'', coinId: "dash"}
    else if(coinGeckoCoin.name.toLowerCase() === "bitcoin cash" )
        return { platform:'', platformType:'', address:'' , coinId: "bitcoin-cash"}
    else
        return getPlatformInfo(coinGeckoCoin)
}

//--------------------------------------------

function mergeCoinGeckoCoins(){
    const newCoins = []

    for(const coinGeckoCoin of coinGeckoCoins){
        const platform = generateId(coinGeckoCoin)
        const coinId = platform.coinId
        const platfromJson = { name: platform.platform, address: platform.address, type: platform.platformType }

        if(platform.platform){
            newCoins.push({
                id : coinId,
                code : coinGeckoCoin.symbol,
                name : coinGeckoCoin.name,
                platform : platfromJson,
                external_id: {
                    coingecko: coinGeckoCoin.id,
                }
            })
        } else {
            newCoins.push({
                id : coinId,
                code : coinGeckoCoin.symbol,
                name : coinGeckoCoin.name,
                external_id: {
                    coingecko: coinGeckoCoin.id,
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
function addCryptoCompareSmartContractData(appCoin, cryptocomCoin){

    let newAppCoin = appCoin

    if(cryptocomCoin.SmartContractAddress){
        let platformName = ''
        let platformType = ''

        if(cryptocomCoin.BuiltOn == 'ETH'){
            platformName = 'ethereum'
            platformType = 'erc20'
        } else if(cryptocomCoin.BuiltOn == 'TRX'){
            platformName = 'tron'
            platformType = 'tron'
        } else if(cryptocomCoin.BuiltOn == 'BNB'){
            platformName = 'binance'
            platformType = 'bep2'
        }
        newAppCoin.id = `${platformType}|${cryptocomCoin.SmartContractAddress}`
        newAppCoin.platform = { name: platformName, address: cryptocomCoin.SmartContractAddress, type: platformType }
    }

    return newAppCoin
}
//--------------------------------------------

function mergeCryptoCompareCoinsBySmartContract(appCoins, foundcryptocomCoins){
        //  --- Merge coins with Uniq address ------------
        const hasSmartContractCc = foundcryptocomCoins.filter(cryptocomCoin =>
            cryptocomCoin.SmartContractAddress
        )

        const hasSmartContractAppCoins = appCoins.filter(appCoin =>
            appCoin.platform
        )

        const uniqAddressCoinsCc = []
        const uniqAddressCoinsApp = []
        let mergedIndex = 0
        mergedCoinsList.push('*********  Merged By SmartContract (100%) ******************* ')

        for(const appCoin of hasSmartContractAppCoins){

            const found = hasSmartContractCc.filter(cryptocomCoin =>
                cryptocomCoin.SmartContractAddress.trim().toLowerCase() == appCoin.platform.address.trim().toLowerCase()
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
        foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqAddressCoinsCc.indexOf(cc) === -1 )
        console.log(`Merged UniqAddress Coins: ${uniqAddressCoinsApp.length}`)

        return {outCoins: uniqAddressCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}
//--------------------------------------------
function mergeCryptoCompareCoinsByCodeName(appCoins, foundcryptocomCoins){
        //  --- Merge coins with Code/Name ------------
        const uniqCodesCoinsCc = []
        const uniqCodesCoinsApp = []
        let mergedIndex = mergedCoinsList.length
        mergedCoinsList.push('*********  Merged By Code/Name (100%) ******************* ')

        for(let appCoin of appCoins){

            const found = foundcryptocomCoins.filter(cryptocomCoin =>
                cryptocomCoin.Symbol.trim().toLowerCase() == appCoin.code.trim().toLowerCase()
                && ( cryptocomCoin.CoinName.trim().toLowerCase() == appCoin.name.trim().toLowerCase())
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
        foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
        console.log(`Merged UniqCodes and Name Coins: ${uniqCodesCoinsApp.length}`)

        return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}

//--------------------------------------------
function mergeCryptoCompareCoinsByCodeNameIdenticRatio(appCoins, foundcryptocomCoins){
    //  --- Merge coins with Code likely name ------------
    const uniqCodesCoinsCc = []
    const uniqCodesCoinsApp = []
    let mergedIndex = mergedCoinsList.length
    mergedCoinsList.push('*********  Merged By Code(100%)  Name (50%) ******************* ')

    for(let appCoin of appCoins){

        const found = foundcryptocomCoins.filter(cryptocomCoin =>
            cryptocomCoin.Symbol.trim().toLowerCase() == appCoin.code.trim().toLowerCase()
            && 50 <= compareStrings(cryptocomCoin.CoinName.trim().toLowerCase(), appCoin.name.trim().toLowerCase())
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
    foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
    console.log(`Merged Name identic ratio Coins: ${uniqCodesCoinsApp.length}`)

    return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}

//--------------------------------------------
function mergeCryptoCompareCoinsByCodeIdenticRatio(appCoins, foundcryptocomCoins){
    //  --- Merge coins with Code likely name ------------
    const uniqCodesCoinsCc = []
    const uniqCodesCoinsApp = []
    let mergedIndex = mergedCoinsList.length
    mergedCoinsList.push('*********  Merged By Code(90%) ******************* ')

    for(let appCoin of appCoins){

        const found = foundcryptocomCoins.filter(cryptocomCoin =>
            90 <= compareStrings(cryptocomCoin.Symbol.trim().toLowerCase(), appCoin.code.trim().toLowerCase())
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
    foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
    console.log(`Merged Code identic ratio Coins: ${uniqCodesCoinsApp.length}`)

    return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}

//--------------------------------------------
function mergeCryptoCompareCoinsByNameIdenticRatio(appCoins, foundcryptocomCoins){
    //  --- Merge coins with Code likely name ------------
    const uniqCodesCoinsCc = []
    const uniqCodesCoinsApp = []
    let mergedIndex = mergedCoinsList.length
    mergedCoinsList.push('*********  Merged By Code(90%) ******************* ')

    for(let appCoin of appCoins){

        const found = foundcryptocomCoins.filter(cryptocomCoin =>
            90 <= compareStrings(cryptocomCoin.CoinName.trim().toLowerCase(), appCoin.name.trim().toLowerCase())
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
    foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
    console.log(`Merged Name identic ratio Coins: ${uniqCodesCoinsApp.length}`)

    return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}

//--------------------------------------------

function mergeCryptoCompareCoins(){
    const appCoinsFile = readFile(pathAppCoins)
    const jsonAppCoins = JSON.parse(appCoinsFile)
    let appCoins = jsonAppCoins.coins
    let foundcryptocomCoins = Object.values(cryptocomCoins.Data)

    //  --- Merge coins with Uniq address ------------
    let out = mergeCryptoCompareCoinsBySmartContract(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    let outCoins = out.outCoins

    //  --- Merge coins with Code/Name ------------
    out = mergeCryptoCompareCoinsByCodeName(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    outCoins = [].concat(outCoins, out.outCoins)

    //  --- Merge coins with  Name  Identic ------------
    out = mergeCryptoCompareCoinsByCodeNameIdenticRatio(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    outCoins =  [].concat(outCoins, out.outCoins)

    //  --- Merge coins with Code Identic  ------------
    out = mergeCryptoCompareCoinsByCodeIdenticRatio(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    outCoins =  ([].concat(outCoins, out.outCoins)).sort(sortByProperty('code'))

    //  --- Merge coins with  Name  Identic ------------
    out = mergeCryptoCompareCoinsByNameIdenticRatio(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    outCoins =  [].concat(outCoins, out.outCoins)

    console.log('Found items:')
    console.log('CoinGecko', appCoins.length, 'CryptoCompare:', foundcryptocomCoins.length)

    const fileAppCoins = readFile(pathAppCoins)
    const jsonAppCoinsOriginal = JSON.parse(fileAppCoins)
    const appCoinsOriginal = jsonAppCoinsOriginal.coins

    appCoinsOriginal.forEach( oAppCoin => {
        const found = outCoins.filter( outCoin => outCoin.id == oAppCoin.id )
        if(found.length > 0){
            oAppCoin.description = found[0].description
            oAppCoin.external_id['cryptocompare'] = found[0].external_id.cryptocompare
        }
    })

    const outProviderCoins = JSON.parse(JSON.stringify(appCoinsOriginal))
    outProviderCoins.forEach(outCoin => {
        delete outCoin['description']
        delete outCoin['platform']
    })
    saveFile(pathAppCoins, JSON.stringify({coins : appCoinsOriginal}))
    saveFile(pathProviderIds, JSON.stringify({coins : outProviderCoins}))

    saveFile(pathMergedCoins, JSON.stringify(mergedCoinsList))

    //--------------------------------------------
    getNotMergedCoins(appCoins, foundcryptocomCoins)
}

//--------------------------------------------
function getNotMergedCoins(appCoins, foundcryptocomCoins){
    mergedCoinsList = []
    appCoins = appCoins.sort(sortByProperty(`code`))
    foundcryptocomCoins = foundcryptocomCoins.sort(sortByProperty('Symbol'))

    let mergedIndex = 0

    for(const appCoin of appCoins){
        const appCoinData = `${appCoin.code} - ${appCoin.name}`
        mergedCoinsList.push(`${++mergedIndex} - ${appCoinData} `)
    }
    saveFile(pathNotMergedCoinGeckoCoins, JSON.stringify(mergedCoinsList))

    mergedIndex = 0
    mergedCoinsList = []

    for(const cryptocomCoin of foundcryptocomCoins){
        const cryptocomCoinData = `${cryptocomCoin.Symbol} - ${cryptocomCoin.CoinName}`
        mergedCoinsList.push(`${++mergedIndex} - ${cryptocomCoinData} `)
    }

    saveFile(pathNotMergedCryptocomCoins, JSON.stringify(mergedCoinsList))

}
//--------------------------------------------

function mergeAppCoinsBySmartContract(appCoins, categoryCoins){

        //  --- Merge coins with Uniq address ------------
        const hasSmartContractCatCoins = categoryCoins.filter(catCoin =>
            catCoin.platform && catCoin.platform.address
        )

        const hasSmartContractAppCoins = appCoins.filter(appCoin =>
            appCoin.platform && appCoin.platform.address
        )

        const uniqCoinsCat= []
        const uniqCoinsApp = []
        let mergedIndex = 0

        mergedCoinsList.push('*********  Merged By SmartContract (100%) ******************* ')

        for(const catCoin of hasSmartContractCatCoins){

            const found = hasSmartContractAppCoins.filter(appCoin =>
                appCoin.platform.address.trim().toLowerCase() == catCoin.platform.address.trim().toLowerCase()
            )

            if(found.length > 0){

                if(found.length > 1){
                } else {
                    catCoin.id = found[0].id
                    catCoin.description = found[0].description
                    uniqCoinsApp.push(found[0])
                }
                uniqCoinsCat.push(catCoin)
            }
        }
        appCoins = appCoins.filter(appC => uniqCoinsApp.indexOf(appC) === -1 )
        categoryCoins = categoryCoins.filter(cc => uniqCoinsCat.indexOf(cc) === -1 )
        console.log(`Merged UniqAddress App Coins: ${uniqCoinsCat.length}`)

        return {outCoins: uniqCoinsCat, appCoins: appCoins, categoryCoins  }

}
//--------------------------------------------

function mergeAppCoinsByCodeNameIdenticRatio(appCoins, categoryCoins){

    //  --- Merge coins with Code/Name address ------------

    const uniqCoinsCat= []
    const uniqCoinsApp = []
    let mergedIndex = 0

    mergedCoinsList.push('*********  Merged By Code/Name (100%) ******************* ')

    for(const catCoin of categoryCoins){

        const found = appCoins.filter(appCoin =>
            appCoin.code.trim().toLowerCase() == catCoin.code.trim().toLowerCase()
            && 70 <= compareStrings(catCoin.name.trim().toLowerCase(), appCoin.name.trim().toLowerCase())
        )

        if(found.length > 0){

            if(found.length > 1){
                console.log('dublicate')
            } else {
                catCoin.id = found[0].id
                catCoin.description = found[0].description
                uniqCoinsApp.push(found[0])
            }
            uniqCoinsCat.push(catCoin)
        }
    }
    appCoins = appCoins.filter(appC => uniqCoinsApp.indexOf(appC) === -1 )
    categoryCoins = categoryCoins.filter(cc => uniqCoinsCat.indexOf(cc) === -1 )
    console.log(`Merged Uniq Code/Name App Coins: ${uniqCoinsCat.length}`)

    return {outCoins: uniqCoinsCat, appCoins: appCoins, categoryCoins  }

}
//--------------------------------------------

function mergeAppCoins(){
    let appCoinsJson = JSON.parse(fileAppCoins)
    let appCoins = appCoinsJson.coins

    let categoryCoinsJson = JSON.parse(fileCoinsCategory)
    let categoryCoins = categoryCoinsJson.coins

    //  --- Merge coins with Uniq address ------------
    let out = mergeAppCoinsBySmartContract(appCoins, categoryCoins)
    appCoins = out.appCoins
    categoryCoins = out.categoryCoins
    let outCoins = out.outCoins

    //  --- Merge coins with Uniq Code/Name ------------
    out = mergeAppCoinsByCodeNameIdenticRatio(appCoins, categoryCoins)
    appCoins = out.appCoins
    categoryCoins = out.categoryCoins
    outCoins = [].concat(outCoins, out.outCoins)
    notMergedCoins = categoryCoins.filter(cc => outCoins.indexOf(cc) === -1 )

    notMergedCoins.forEach(notMCoin =>
        console.log(`${notMCoin.code} - ${notMCoin.name}`)
    )

    saveFile('./config/cat.json', JSON.stringify(outCoins))

}

//--------------------------------------------

mergeCoinGeckoCoins()
mergeCryptoCompareCoins()
//mergeAppCoins()
