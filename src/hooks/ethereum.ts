import { useState, useMemo, useCallback, useEffect } from 'react'
import { Contract } from '@ethersproject/contracts'
import { useWeb3React as useWeb3ReactCore } from '@web3-react/core'
import {
  injected as injectedConnector,
  network as networkConnector,
} from '../connectors'
import { getContract, getGasPrice } from '../utils'
import { NetworkContextName } from '../constants'
import ERC20_ABI from '../constants/abis/erc20.json'
import EXCHANGE_ABI from '../constants/abis/WhiteHoleSwap.json'

export function useWeb3React() {
  const context = useWeb3ReactCore()
  const contextNetwork = useWeb3ReactCore(NetworkContextName)

  return context.active ? context : contextNetwork
}

export function useContract(
  address: string,
  ABI: any,
  withSignerIfPossible = true,
): Contract | null {
  const { library, account } = useWeb3React()

  return useMemo(() => {
    if (!address || !ABI || !library) return null
    try {
      return getContract(
        address,
        ABI,
        library,
        withSignerIfPossible && account ? account : undefined,
      )
    } catch (error) {
      console.error('Failed to get contract', error)
      return null
    }
  }, [address, ABI, library, withSignerIfPossible, account])
}

export function useTokenContract(
  tokenAddress: string,
  withSignerIfPossible = true,
) {
  const { library, account } = useWeb3ReactCore()

  return useMemo(() => {
    try {
      return getContract(
        tokenAddress,
        ERC20_ABI,
        library,
        withSignerIfPossible && account ? account : undefined,
      )
    } catch {
      return null
    }
  }, [tokenAddress, library, withSignerIfPossible, account])
}

export function useExchangeContract(
  exchangeAddress: string,
  withSignerIfPossible: boolean = true,
) {
  const { library, account } = useWeb3ReactCore()

  return useMemo(() => {
    try {
      return getContract(
        exchangeAddress,
        EXCHANGE_ABI,
        library,
        withSignerIfPossible && account ? account : undefined,
      )
    } catch {
      return null
    }
  }, [account, exchangeAddress, library, withSignerIfPossible])
}

export function useGasPrice() {
  const [level, setLevel] = useState('fast')
  const getPrice = useCallback(() => getGasPrice(level), [level])

  return { getPrice, setLevel }
}

export function useEagerConnect() {
  const { activate, active, setError } = useWeb3ReactCore()

  const [tried, setTried] = useState(false)

  useEffect(() => {
    injectedConnector.isAuthorized().then((isAuthorized) => {
      if (isAuthorized) {
        activate(injectedConnector, undefined, true).catch((err) => {
          setError(err)
          setTried(true)
        })
      } else {
        setTried(true)
      }
    })
  }, [activate, setError])

  useEffect(() => {
    if (!tried && active) {
      setTried(true)
    }
  }, [tried, active])

  return tried
}

export function useInactiveListener(suppress = false) {
  const { active, error, activate } = useWeb3ReactCore()

  useEffect(() => {
    const { ethereum } = window
    if (ethereum && !active && !error && !suppress) {
      const handleNetworkChanged = () => {
        activate(injectedConnector)
      }
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          activate(injectedConnector)
        }
      }

      if (ethereum.on) {
        ethereum.on('chainChanged', handleNetworkChanged)
        ethereum.on('accountsChanged', handleAccountsChanged)
      }

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('chainChanged', handleNetworkChanged)
          ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }

    return () => {}
  }, [active, error, suppress, activate])
}

export function useReadOnlyConnect(triedEager = false) {
  const { active } = useWeb3ReactCore()
  const {
    active: activeNetwork,
    error: errorNetwork,
    activate: activateNetwork,
  } = useWeb3ReactCore(NetworkContextName)

  useEffect(() => {
    if (triedEager && !activeNetwork && !errorNetwork && !active) {
      activateNetwork(networkConnector)
    }
  }, [activateNetwork, active, activeNetwork, errorNetwork, triedEager])
}
