import { unixfs } from '@helia/unixfs'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { EncBlockstore } from 'blockstore-enc'
import type { Blockstore } from 'interface-blockstore'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { bootstrap } from '@libp2p/bootstrap'
import { identify } from '@libp2p/identify'
import { tcp } from '@libp2p/tcp'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'

async function createNode (blockstore: Blockstore) {
  const datastore = new MemoryDatastore()

  const libp2p = await createLibp2p({
    datastore,
    addresses: {
      listen: [
        '/ip4/127.0.0.1/tcp/0'
      ]
    },
    transports: [
      tcp()
    ],
    connectionEncrypters: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ],
    peerDiscovery: [
      bootstrap({
        list: [
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
        ]
      })
    ],
    services: {
      identify: identify()
    }
  })

  return await createHelia({
    datastore,
    blockstore,
    libp2p
  })
}


const memBlockstore1 = new MemoryBlockstore()
const encStore1 = new EncBlockstore(memBlockstore1)
const password1 = 'strong-password-is-strong1' // Must be at least 16 bytes long
const salt1 = new TextEncoder().encode('salty-salt-is-salty1') // Must be at least 16 bytes long
await encStore1.init(password1, salt1)
await encStore1.open()

const memBlockstore2 = new MemoryBlockstore()
const encStore2 = new EncBlockstore(memBlockstore2)
const password2 = 'strong-password-is-strong2' // Must be at least 16 bytes long
const salt2 = new TextEncoder().encode('salty-salt-is-salty2') // Must be at least 16 bytes long
await encStore2.init(password2, salt2)
await encStore2.open()

// create two helia nodes
const node1 = await createNode(encStore1)
const node2 = await createNode(encStore2)

const multiaddrs = node2.libp2p.getMultiaddrs()
await node1.libp2p.dial(multiaddrs[0])

const fs1 = unixfs(node1)
const fs2 = unixfs(node2)


// we will use this TextEncoder to turn strings into Uint8Arrays
const encoder = new TextEncoder()

// add the bytes to your node and receive a unique content identifier
const cid = await fs1.addBytes(encoder.encode('Hello World 301'))

console.log('Added file:', cid.toString())


// this decoder will turn Uint8Arrays into strings
const decoder = new TextDecoder()
let text = ''

// read the file from the blockstore using the second Helia node
for await (const chunk of fs2.cat(cid)) {
  text += decoder.decode(chunk, {
    stream: true
  })
}

console.log('Added file contents:', text)

process.exit(0)
