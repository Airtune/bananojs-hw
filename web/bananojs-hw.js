// begin hacks thaat make require() work.
window.bananocoin.other['@bananocoin/bananojs'] = window.bananocoinBananojs;
window.bananocoin.other['@bananocoin/bananojs-hw'] = window.bananocoinBananojsHw;
window.bananocoin.other['hw-app-nano'] = window.BananoHwApp;
window.bananocoin.other['@ledgerhq/hw-transport-node-hid'] =
  window.TransportWebUSB;
window.bananocoin.other['@ledgerhq/hw-transport-u2f'] =
  window.TransportWebU2F; // TODO: is this needed?
// end hacks thaat make require() work.
if (window.bananocoin.bananojsHw === undefined) {
  window.bananocoin.bananojsHw = {};
}

let _webUSBSupported = undefined;
const webUSBSupported = async () => {
  console.log(`webusb check fix in place5`);
  if (_webUSBSupported === undefined) {
    _webUSBSupported = await window.TransportWebUSB?.isSupported();
    console.log(`_webUSBSupported:${_webUSBSupported}`);
  }
  console.log(`_webUSBSupported3:${_webUSBSupported}`);

  return _webUSBSupported;
};

const getLedgerAccountDataUsingWebUSB = async (index) => {
  // https://github.com/BananoCoin/bananovault/blob/master/src/app/services/ledger.service.ts#L128
  const getLedgerPath = window.bananocoinBananojsHw.getLedgerPath;

  const BananoHwApp = window.BananoHwApp;
  const TransportWebUSB = window.TransportWebUSB;
  const transport = await TransportWebUSB.create();
  // console.log('getLedgerAccountData', 'transport', transport);
  try {
    const banHwAppInst = new BananoHwApp(transport);
    // console.log('getLedgerAccountData', 'banHwAppInst', banHwAppInst);
    const ledgerPath = getLedgerPath(index);
    // console.log('getLedgerAccountData', 'ledgerPath', ledgerPath);
    const accountData = await banHwAppInst.getAddress(ledgerPath);
    console.log('getLedgerAccountData', 'accountData', accountData);
    accountData.account = accountData.address;
    delete accountData.address;
    return accountData;
  } finally {
    await transport.close();
  }
}

const getLedgerAccountDataUsingU2F = async (index) => {
  console.log(`getLedgerAccountDataUsingU2F index: ${index}`)
  const getLedgerPath = window.bananocoinBananojsHw.getLedgerPath;
  console.log(`getLedgerPath: ${typeof(getLedgerPath)}`);
  try {
    const ledgerPath = getLedgerPath(index);
    console.log(`getLedgerPath return: ${ledgerPath}`);
    return await window.transportWebU2FInstance.getAddress(ledgerPath);
  } catch (error) {
    throw error;
  }
};

// WebUSB or U2F ready
window.bananocoin.bananojsHw.onUsbReady = async (callback) => {
  console.log('calling window.bananocoin.bananojsHw.onUsbReady');
  const BananoHwApp = window.BananoHwApp;
  const webUsbSupported = await webUSBSupported().catch((error) => { throw(error); });
  if (webUsbSupported) {
    callback();
  } else {
    /** https://github.com/Nault/Nault/blob/cd6d388e60ce84affaa813991445734cdf64c49f/src/app/services/ledger.service.ts#L268 */
    /** Creates alternative method for reading from USB, used in Firefox. Legacy technology; desperately want to remove this but people keep asking for Firefox support. */
    console.log(`not webusb but u2f`);
    const u2fPromise = new Promise((resolve, reject) => {
      window.TransportWebU2F.create()
        .then((trans) => {
          console.log(`assiging window.transportWebU2FInstance`);
          console.log(trans);
          const uf2Instance = new BananoHwApp(trans);
          window.transportWebU2FInstance = uf2Instance;
          console.log('yatta! ------------------');
          console.log(window.bananocoinBananojsHw.getLedgerPath(0));
          console.log(uf2Instance.getAddress(window.bananocoinBananojsHw.getLedgerPath(0)));
          resolve();
        })
        .catch(reject);
    });

    try {
      await u2fPromise;
      callback();
    } catch(error) {
      console.log(`ohno`);
      throw(error);
    }
  }
}

window.bananocoin.bananojsHw.getLedgerAccountData = async (index) => {
  console.log(`getLedgerAccountData`);
  const webUsbSupported = await webUSBSupported();
  console.log(`webUsbSupported: ${webUsbSupported}`);
  if (webUsbSupported) {
    console.log(`getLedgerAccountDataUsingWebUSB`);
    return await getLedgerAccountDataUsingWebUSB(index);
  } else {
    console.log(`getLedgerAccountDataUsingU2F`);
    return await getLedgerAccountDataUsingU2F(index);
  }
};

window.bananocoin.bananojsHw.getLedgerAddressFromIndex = async (index) => {
  let accountData;

  try {
    accountData = await window.bananocoin.bananojsHw.getLedgerAccountData(index);
  } catch (error) {
    throw error;
  }

  const webUsbSupported = await webUSBSupported();
  if (webUsbSupported && accountData?.account) {
    return accountData.account;
  }

  if (window.transportWebU2FInstance && accountData?.address) {
    return accountData.address;
  }
}

window.bananocoin.bananojsHw.getLedgerAccountSigner = async (accountIx) => {
  const config = window.bananocoinBananojsHw.bananoConfig;
  /* istanbul ignore if */
  if (config === undefined) {
    throw Error('config is a required parameter.');
  }
  /* istanbul ignore if */
  if (accountIx === undefined) {
    throw Error('accountIx is a required parameter.');
  }

  const webUsbSupported = await webUSBSupported();
  if (webUsbSupported) {
    console.log(`return createSignerUsingWebUSB`);
    return createSignerUsingWebUSB(accountIx);
  }

  if (window.transportWebU2FInstance) {
    console.log(`return createSignerUsingU2F`);
    return createSignerUsingU2F(accountIx);
  }
};

const createSignerUsingWebUSB = async (accountIx) => {
  console.log(`createSignerUsingWebUSB`);
  const config = window.bananocoinBananojsHw.bananoConfig;
  const getLedgerPath = window.bananocoinBananojsHw.getLedgerPath;
  const bananodeApi = window.bananocoinBananojs.bananodeApi;

  const BananoHwApp = window.BananoHwApp;
  const TransportWebUSB = window.TransportWebUSB;

  /* istanbul ignore if */
  if (config === undefined) {
    throw Error('config is a required parameter.');
  }
  /* istanbul ignore if */
  if (accountIx === undefined) {
    throw Error('accountIx is a required parameter.');
  }
  // https://github.com/BananoCoin/bananovault/blob/master/src/app/services/ledger.service.ts#L379
  const transport = await TransportWebUSB.create();
  let accountData;
  try {
    const banHwAppInst = new BananoHwApp(transport);
    const ledgerPath = getLedgerPath(accountIx);
    accountData = await banHwAppInst.getAddress(ledgerPath);
  } finally {
    await transport.close();
  }
  const signer = {};
  signer.getPublicKey = () => {
    return accountData.publicKey;
  };
  signer.getAccount = () => {
    return accountData.address;
  };
  signer.signBlock = async (blockData) => {
    const transport = await TransportWebUSB.create();
    try {
      const banHwAppInst = new BananoHwApp(transport);
      const ledgerPath = getLedgerPath(accountIx);

      // console.log('signer.signBlock', 'blockData', blockData);
      const hwBlockData = {};
      if (
        blockData.previous ==
        '0000000000000000000000000000000000000000000000000000000000000000'
      ) {
        hwBlockData.representative = blockData.representative;
        hwBlockData.balance = blockData.balance;
        hwBlockData.sourceBlock = blockData.link;
      } else {
        hwBlockData.previousBlock = blockData.previous;
        hwBlockData.representative = blockData.representative;
        hwBlockData.balance = blockData.balance;
        hwBlockData.recipient = window.bananocoinBananojs.getBananoAccount(
          blockData.link,
        );

        const cacheBlockData = {};
        const cacheBlocks = await bananodeApi.getBlocks(
          [blockData.previous],
          true,
        );
        // console.log('signer.signBlock', 'cacheBlocks', cacheBlocks);
        const cacheBlock = cacheBlocks.blocks[blockData.previous];
        // console.log('signer.signBlock', 'cacheBlock', cacheBlock);
        cacheBlockData.previousBlock = cacheBlock.previous;
        cacheBlockData.representative = cacheBlock.representative;
        cacheBlockData.balance = cacheBlock.balance;
        cacheBlockData.recipient = window.bananocoinBananojs.getBananoAccount(
          cacheBlock.link,
        );
        // console.log('signer.signBlock', 'cacheBlockData', cacheBlockData);
        try {
          // const cacheResponse =
          await banHwAppInst.cacheBlock(
            ledgerPath,
            cacheBlockData,
            cacheBlock.signature,
          );
          // console.log('signer.signBlock', 'cacheResponse', cacheResponse);
        } catch (error) {
          console.log('signer.signBlock', 'error', error.message);
          console.trace(error);
        }
      }

      // console.log('signer.signBlock', 'hwBlockData', hwBlockData);
      return await banHwAppInst.signBlock(ledgerPath, hwBlockData);
    } finally {
      await transport.close();
    }
  };
  return signer;
}

const createSignerUsingU2F = async (accountIx) => {
  console.log(`createSignerUsingU2F`);
  const getLedgerPath = window.bananocoinBananojsHw.getLedgerPath;
  const bananodeApi = window.bananocoinBananojs.bananodeApi;

  const ledgerPath = getLedgerPath(accountIx);
  const accountData = await getLedgerAccountDataUsingU2F(ledgerPath).catch((error) => { throw (error); });

  const signer = {};
  signer.getPublicKey = () => {
    return accountData.publicKey;
  };
  signer.getAccount = () => {
    return accountData.address;
  };
  signer.signBlock = async (blockData) => {
    try {
      // console.log('signer.signBlock', 'blockData', blockData);
      const hwBlockData = {};
      if (blockData.previous == '0000000000000000000000000000000000000000000000000000000000000000') {
        hwBlockData.representative = blockData.representative;
        hwBlockData.balance = blockData.balance;
        hwBlockData.sourceBlock = blockData.link;
      } else {
        hwBlockData.previousBlock = blockData.previous;
        hwBlockData.representative = blockData.representative;
        hwBlockData.balance = blockData.balance;
        hwBlockData.recipient = window.bananocoinBananojs.getBananoAccount(blockData.link);

        const cacheBlockData = {};
        const cacheBlocks = await bananodeApi.getBlocks([blockData.previous], true);
        // console.log('signer.signBlock', 'cacheBlocks', cacheBlocks);
        const cacheBlock = cacheBlocks.blocks[blockData.previous];
        // console.log('signer.signBlock', 'cacheBlock', cacheBlock);
        cacheBlockData.previousBlock = cacheBlock.previous;
        cacheBlockData.representative = cacheBlock.representative;
        cacheBlockData.balance = cacheBlock.balance;
        cacheBlockData.recipient = window.bananocoinBananojs.getBananoAccount(cacheBlock.link);
        // console.log('signer.signBlock', 'cacheBlockData', cacheBlockData);
        try {
          // const cacheResponse =
          await window.transportWebU2FInstance.cacheBlock(
            ledgerPath,
            cacheBlockData,
            cacheBlock.signature
          );
          // console.log('signer.signBlock', 'cacheResponse', cacheResponse);
        } catch (error) {
          console.log('signer.signBlock', 'error', error.message);
          console.trace(error);
        }
      }

      console.log('signer.signBlock', 'hwBlockData', hwBlockData);
      const results = await window.transportWebU2FInstance.signBlock(
        ledgerPath,
        hwBlockData
      );

      return results;
    } finally {
      // .....
    }
  };
  return signer;
};
