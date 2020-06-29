import ethers from 'ethers'

import { NetworksByIdStr } from 'data/Networks'
import supportedTokens from './supportedTokens'

const networks = {}
try {
  networks.mainnet = require('@origin/contracts/build/contracts_mainnet.json')
  networks.rinkeby = require('@origin/contracts/build/contracts_rinkeby.json')
  networks.localhost = require('@origin/contracts/build/contracts.json')
} catch (e) {
  /* Ignore */
}

const DefaultPaymentMethods = [
  { id: 'crypto', label: 'Crypto Currency' },
  { id: 'stripe', label: 'Credit Card' }
]

const net = localStorage.ognNetwork
const activeNetwork = NetworksByIdStr[net] || NetworksByIdStr['localhost']
const netId = String(activeNetwork.id)
const contracts = networks[activeNetwork.idStr] || {}

const DefaultTokens = supportedTokens

let config

async function fetchConfig(dataSrc, activeShop) {
  config = { backend: '', firstTimeSetup: true, netId }
  if (!dataSrc || dataSrc === 'DATA_DIR/') {
    return config
  }

  try {
    const url = `${dataSrc}config.json`
    console.debug(`Loading config from ${url}...`)

    config = await fetch(url).then((raw) => raw.json())
    if (!config.backend) config.backend = ''
    if (!config.paymentMethods) {
      config.paymentMethods = DefaultPaymentMethods
    }
    config.paymentMethods = config.paymentMethods.filter((m) => {
      if (m.id === 'stripe' && !config.stripeKey) {
        return false
      }
      return true
    })
    let supportEmailPlain = config.supportEmail
    if (supportEmailPlain.match(/<([^>]+)>/)[1]) {
      supportEmailPlain = supportEmailPlain.match(/<([^>]+)>/)[1]
    }

    config.supportEmailPlain = supportEmailPlain
    const netConfig = config.networks[netId] || {}

    if (netId === '999' && process.env.MARKETPLACE_CONTRACT) {
      // Use the address of the marketplace contract deployed on the local test network.
      netConfig.marketplaceContract = process.env.MARKETPLACE_CONTRACT
    }

    const tokenList =
      netConfig.acceptedTokens || config.acceptedTokens || DefaultTokens

    const acceptedTokens = tokenList
      .map((token) => {
        if (token.name === 'ETH') {
          token.address = ethers.constants.AddressZero
        } else if (!token.address && contracts[token.name]) {
          token.address = contracts[token.name]
        }
        return token
      })
      .filter((token) => token.address)

    return {
      ...config,
      ...netConfig,
      netId,
      contracts,
      acceptedTokens,
      netName: activeNetwork.name,
      dataSrc,
      activeShop
    }
  } catch (err) {
    return config
  }
}

export default fetchConfig
