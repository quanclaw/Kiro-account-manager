// Ad Configuration
export const adConfig = {
  // Popunder ad settings (disabled)
  popunder: {
    enabled: false,
    scriptUrl: 'https://authoritieswoundjoint.com/3c/84/df/3c84dfb697102abda06f1a1db188ed03.js',
    delay: 3, // seconds after app start
  },
  
  // SmartLink ad settings
  smartlink: {
    enabled: true,
    url: 'https://authoritieswoundjoint.com/iccgfzejj?key=73846ae2fe202fee3bc083b30d8889f9',
    text: 'Support Development',
  },
  
  // Banner ad settings
  banner: {
    enabled: true,
    url: 'https://example.com/banner-ad',
    width: 200,
    height: 80,
    closeable: true,
  },
  
  // Modal ad settings (can be disabled if using popunder)
  modal: {
    enabled: false, // Disable modal since we're using popunder
    url: 'https://example.com/modal-ad',
    width: 400,
    height: 300,
    showInterval: 30, // minutes
    initialDelay: 5000, // 5 seconds after app start
  },
  
  // Ad network settings
  network: {
    provider: 'authoritieswoundjoint',
    publisherId: 'direct-link-520741',
  },
  
  // Tracking settings
  tracking: {
    enabled: true,
    analyticsId: 'your-analytics-id',
  }
}

// You can update these URLs with your actual ad URLs
export const updateAdUrls = (bannerUrl: string, modalUrl: string) => {
  adConfig.banner.url = bannerUrl
  adConfig.modal.url = modalUrl
}