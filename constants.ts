import { Category, FeaturedCategory, Product } from './types';

export const CATEGORIES: Category[] = [
  { id: 'featured', name: 'Featured', hasSubmenu: true },
  { id: 'home', name: 'Home & Kitchen', hasSubmenu: true },
  { id: 'women-clothing', name: "Women's Clothing", hasSubmenu: true },
  { id: 'women-curve', name: "Women's Curve Clothing", hasSubmenu: true },
  { id: 'women-shoes', name: "Women's Shoes", hasSubmenu: true },
  { id: 'men-clothing', name: "Men's Clothing", hasSubmenu: true },
  { id: 'men-shoes', name: "Men's Shoes", hasSubmenu: true },
  { id: 'sports', name: "Sports & Outdoors", hasSubmenu: true },
  { id: 'jewellery', name: "Jewellery & Accessories", hasSubmenu: true },
  { id: 'beauty', name: "Beauty & Health", hasSubmenu: true },
  { id: 'toys', name: "Toys & Games", hasSubmenu: true },
];

export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  { id: '1', name: 'Tablets, Laptops & Accessories', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3FdQewYpsr043pmB9j-DGziM-vJ0D3_4GR5ChFwvYT-sGVUPWagirOI3lBTqmgysQGFs9hAAlWz4akMCNb2Mn6ASEXveso3fgJfGxbRnQn1c3TkMdJA9awIHgVnKZqsjvkwaC0pwSEBS0s2Few4JJssLWOUpKlA1dIW0kq73qRz8FDT6EvJYsijzrdY91aJ_FJMFTxW__24cWY7M-z_6okvzem7RlFE-CZzht04Lm2vuVYQYtTq9dVl5tHYWAdCOobZE7Xndzsgg' },
  { id: '2', name: 'Seasonal Decor', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcs7JvzJNL9qCMYBjypGWUaUG-oAlJzKZIZHyafjNAFvNXbMX4nrnIDEh8fNbWtY4M57WSid_-Nc2o0mulBkEsuvVzJ8DcQADEEWages07V6kJvAu6sMTWEfQI8mXcwBHGFYCcwJpY8s5YE98-ad7YMtmRU6IY6xYTmmJqH4WtZyXL9wbySrJ85BHce2mzOfdmyNN5QK8f-C_68_HxNRmI1y_smP6cf8tRMn1N5C3xnl5H5lwk4hJYDBhk9xWpu-zY54Uyc2Ll3Y0' },
  { id: '3', name: 'Home Decor Products', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1nADDJd22z--ASEbH2yxHHiJdI61cBbzGt_-vhkhQIF79lwuUaTghzWGAL-vplzqPxhsMNWEbd_e6QTERbh3NQ9zO9augJqvbVtAhA0KlrAfnSmhBY3-I-THkqn-3a3hhETBa_kRkhW7RvXV3zDUnK1lGfI5dum_nevvlVh48uoOeKQkfv98-3NjW8-8BNwl77icckpromKtRu6fTTx7U8uqS6ikIVR7Lf7LZVyXKZGxPiDIVs0crgfs2Dh3PgRJzPNqPK_9Rcwk' },
  { id: '4', name: "Women's Dresses", image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBA_z_NtxN7KpPp2QJcmxci-CazpvxO1Oyw3-sc-afAS1ybiyBMntHpUgO-DdgTwht4LPAWRHhm55neAAcEoMrP-AqKaGuj9xpwbhamDBGr9f3LCuAQfa4_Fnr413mRPAoiXo4IRcAJXCpvfyt4VoKV7jge5QCuuYzZVSI1JFYF_IRhaqYavPos1otK76ukQEpQEVjEoOgSq55LBATuODGtX4y08jpFWIRa_DBamKzslDeW_3nGJFFJxs8R7z1R6HfFvqlHOyMTgRo' },
  { id: '5', name: "Women's Coats & Jackets", image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcRBWJKn89BzMrwIsdZUDxCijz3yRXBo4XaJ7g0KJ6sLMQ59dQfGVmHJ38Io7zC8f6UpIl0sUdLkXf4X0WlxDGaq0EP6TxOOHg4NEfzA8FhUHsQ7ER238f4uI0BAuoKuf12oKEavJcSPUGGtrkdnakTq0PSVtgyymTw_XxwvD-qdA3vM1c7lHYYDsqAN7J0PCa9FZu4DegtW1YmXkTpO1-4E-68_kJQj2BiJ_pq7ECyfhVC9JdPewajYqxgY2imD0G6hODEXpZ57M' },
  { id: '6', name: "Women's Jewellery", image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCK333eJRKn6Ai_Laszck0Yek6rFyDcqvzhFNsD0J0tH7LhDVb97cOcB9zDRTY2qI5PTyWwTF80F0R8cdfGCQ9lkFl3sR60-QPWpRDgmIbX9575gYVva5fsCr8DjjPxl_gDNtU2UtttR7_vShEsEAzg5ZwElrh_6O0RKRO9klQcpSJQE6C2nVULXKU215_MPyv4j8_B7jvdgeotQrZXzlC0Q5Ax8I6kXIL0sfpU6OKN0FZK3qY6lFY2XqChW2s1O7Ao_-k4okS2EHk' },
  { id: '7', name: "Men's Jackets & Coats", image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDUXA_FyuGhqNoh45XXKdh9k06h0yAdetg1FOwd0aRppPUAtf6dvPdmULPdRU3-Cdj2DAfVoeeDQV3pcqR3h_xlA-Nsj16XNyskQkvAcMMiNYOje_B08UxEC0s0_etyLIJv4dHERUXECB5cfPGzVTqrYv6rwjgwxjy_sxePW24PO7daC2z0fDnR_1kZ0qiopxIGPQJYsRrFrh_a2U6uc6IthCJVFJZaPdeoBh4zUUMwJ0g6roaknJKzGv-xIHzLxr4nkWgwqhrf_PU', isHot: true },
  { id: '8', name: "Men's Activewear", image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOHscWjsNiDZFyhZ6TQ-kp0XTsW5LPMiUWJBs9IexgAj34sFU2UVDsKge5CdSs-VxuB3DxWj-igyAZ3fsrgdWjgdQOuLmgMtg2dDybxp6VUWwboBbHuS07R9HUBjXBXVrsdufTN3i35k2XWSa6t5muTMgEOyIsZRkkiWDBLa-Gf07x_vnT7ddNhJeUa3_fozOG-Rf7tX485ZfpyvbLg1RKBFF_LGsKLXmknJwsIrif7FLAySrBBBWX9En3_xIJ21f0141fdMOFoR8', isHot: true },
];

export const PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Apple iPhone 14 - 128GB - Yellow",
    price: 282.00,
    rating: 5,
    reviews: 27,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCNsmjNqH2r5UAltlm3Q1c4sMuX1kO5Lf4rRIAVh_gHgNzR-Zu7qqp670qopGmBV7E_kEHhagw9I2Tj5zEfTy3JCI1Jmkj7PAsbXIEIfd_BgG-zUxDnE_O6rsdQ2BvewYYu7mP_9G0tx_ZNDLhY18yz9HAwO5PwJFlgTYr1CwMAmwvAis88dKJC8Azv0fLszEhEfLszBrizQe4A5gdvi1uzKqcI0xdphh1qJkYEN137Lday7NGnQHR-7D6JfgMWiiywxhjYCeyUni8",
    badge: "BLACK FRIDAY",
    deliveryDate: "Tues, Nov 28",
    description: "Experience the ultimate iPhone with 5G speed, A15 Bionic chip, and a stunning OLED display. Perfect for everything from gaming to photography."
  },
  {
    id: 2,
    title: "New sealed in box iPhone 13",
    price: 198.00,
    rating: 4.5,
    reviews: 107,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAJnujdP4Gm7lK2wlrBlfFvjHt4CRJ8UaU-RxYuo1GOQklRMtLUplLFaXZC7k7v3uDeXZytsRXAfFKiRMKDYJZ3I_NLWHF5kbjWF21yousSv2fTVRXKo9JREQGmqXPieq2qZhYdM7KjEJnUgZLchjqoFDhyNK7Z7Vl3OK4fYZlv-FX-jfpzXyk6oDfvJLQrcWs1djYGm805LesHKaX_W03UpaKwQRgMT1qil6o6wCt-uLOyMIKLW3LL-bAJv5RgCqfAk8jMs2qstDc",
    badge: "BLACK FRIDAY",
    deliveryDate: "Wed, Nov 29",
    description: "Sealed box iPhone 13, completely unlocked. Amazing battery life and dual-camera system capture your moments in style."
  },
  {
    id: 3,
    title: "Unlocked Smartphone",
    price: 87.00,
    rating: 5,
    reviews: 117,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCpebUxRsgfg-4-71-O0f7YSroxczX2vKJRObHnKpTCIEYD8jriKk_pNqMRrS36M6d1jqDOyaQIpKVnte80lqjKXDQeAavKdYmX4alnjl9upG9Vwm6XxNjCgYOt003XX3jjDtgNFbGQc2rETcvHJi1GLqy-3oW5nIBYFt5wt3a0cbSf0PVAGo-ZTJFhma6obtIeaPIdPxh1Jg4HP6WbgZcumL-aRY95skaWxUK05KiBUFROvlmgFwawnA76Y1aVNokIPROH5O5ML7w",
    badge: "BLACK FRIDAY",
    deliveryDate: "Thurs, Nov 30",
    description: "Affordable unlocked smartphone with decent specs for everyday use. Great value for a secondary device or first phone."
  },
  {
    id: 4,
    title: "2pcs Bed Pillows for Sleeping",
    price: 32.00,
    rating: 4.5,
    reviews: 52,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAGX85cueHa4pEmbApcYsYqtBQlPLqzFI0Wsw_GvWjsedKKpdUXXA_vrt8yg9387iTxd5eMfQrIkmge-bOEMoM4MSF0nL8hsiJR3FkYXUDNnZwAVcqMvBD117rHTmhcYfIH1JGCATjb1zZkf_09_HMlZHmRRggy0afE-bmPTKmzg8HKmcxMy5cewH0tNaCFIxIwq-1SFHXZFX17_QM0ZtVWPPSyfl59Se0F8DUPDCh3P-kCNm9ydFEiD53dH4zDDiJnPgBIz4fgmbo",
    badge: "BLACK FRIDAY",
    deliveryDate: "Tues, Nov 28",
    description: "Set of 2 hypoallergenic bed pillows for a restful night's sleep. Soft yet supportive, ideal for all sleeping positions."
  },
  {
    id: 5,
    title: "Neck Pillow for Mobility & Daily",
    price: 18.00,
    rating: 5,
    reviews: 96,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCCtkHi2q_dEJ-fBGIe3uPpX-YD7gUfoSq_oHnH9_F_PUU6TLBCyCxfJa4um0k3MiYFS9b7GZL4CNHLE7yknBvIvCnpG-o-sQ2_GJIbM6wFhvSwpN4Mt6g4p3JK-tq1vUj7o7EcKKALmaTJ5T_zFTn5Umqb6WLYq0TH5KKtVQMrIQOEPCY_HQgKOVPLWudgjHpdbDIFhK6r1-ARCd8__842_tpKG4MQGDthT_iN-i1sE8-dl61HrjE5LGp9eoir0qglP8jgQ0hnxek",
    badge: "BLACK FRIDAY",
    deliveryDate: "Fri, Dec 1",
    description: "Ergonomic neck pillow perfect for travel and daily comfort. Memory foam construction provides lasting support."
  },
  {
    id: 6,
    title: "10.9 inch Tablet 2022",
    price: 287.00,
    rating: 4.5,
    reviews: 309,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD09E4zNlmS1SStN2Tb_TvBhTnaH_8Rgl3VqdSgSJ6yABn2A4Lkl2yiGCa-q3wrz78Df00yKGbh9iCBZWy2pniRDG36njlyQvZTdrS0Cx11Q_N0JPuqzSGsnEo85fsWGWNeabgUhKENP-wtg0sneq3gXKzV78lhbbwOl4D7_qWC9T7JGjVr7d_IOKcYYFXIcMi3PZXfGyeNeXHnsu5UznOdfBXOfBPNqUeZpP26lTYiOG0UVsECeRw9zO0HJw464rKbjB9cNhcVkMA",
    badge: "BLACK FRIDAY",
    deliveryDate: "Tues, Nov 28",
    description: "10.9 inch powerful tablet for work and play. High resolution screen and long battery life."
  },
  {
    id: 7,
    title: "Used/Very Good Laptop",
    price: 142.00,
    rating: 5,
    reviews: 88,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC1-IDv_0NZd4PdzgqZMmj0syfSR-FBpiK24OenCtXWo1_6XVYuYwhdzbtFB61z3bKB29TCYe5Rc00rVOUUTPSUWU_e_dxx0Ns3KCWiFjDKz9oGtjH3s4DkZtlfvnyIBexInwd4H6lBc-UH32nBxfyI69RFA6UMweP6eBnrUKHv3a0ZlY9o45-MI2644wRZ6USAHg03AH_Jd0wANANcUhkrq9cmvVLwI_P1v4pTnyV7CtLS7lw-l7u_HjdMy8WaTmXwXX4m_a3u-T8",
    badge: "BLACK FRIDAY",
    deliveryDate: "Wed, Nov 29",
    description: "Reliable laptop for students and professionals. Checked and verified for quality performance."
  },
  {
    id: 8,
    title: "2-Ply 1000 Sheets/Roll Toilet",
    price: 38.00,
    rating: 4.5,
    reviews: 245,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDUiOuqJgdUOsw_0bact1QWDP0zufW9-gVSshnWhItYXkMpZL-5_uZy0pqon1w7xyqV95rFQrxREUY33Uy5qO45-WTbfRf7oXhcit94iY9CxpB6LyD6e0NrVOR82Sx9g4pHUg2s44zSlPQFQrRbvOhiSy_kiaNOT87QZt46GRy7n7Qpgle6sNC5Pmct9jiykmA1AkezJWPhMMU_RBUKPz0SBBj98t_h1plE_3xfJHLp_x-EMgGrXL2MFkrqHqF6_bugq08a19htnQ0",
    badge: "BLACK FRIDAY",
    deliveryDate: "Thurs, Nov 30",
    description: "Bulk pack of soft, 2-ply toilet paper. 1000 sheets per roll, long-lasting and economical."
  },
  {
    id: 9,
    title: "Pro Hair Clipper & Trimmer Kit",
    price: 16.00,
    rating: 5,
    reviews: 312,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBfC8tsTe4gQDhlbT85WZC1zsWS8FpWATrSfa0HJwxgv5c6kxu16vt7Rr7b_rc8VRX6f958ih5MYOq8ePZ-Acapt_Oq-ogJu_1vyCgjBeJxtgn1Q7ONO_0WdtT5WMGu7BarRnPdvdy43r4r2rqNTMMkzzuKyXmYFCfrdyZoyRrpij5Cs9JdBV6Ti45hvq4kuftDRnWIpt3_OHk_8bSaNxQBFhPsqQ3JtrG1cQ2AanlCuWEU9iRoBV74Two20nB1fma4XFFJTk-hpX4",
    badge: "BLACK FRIDAY",
    deliveryDate: "Fri, Dec 1",
    description: "Professional grade hair clipper kit for precise grooming at home. Includes various guards and accessories."
  },
  {
    id: 10,
    title: "Fitness Talking Smartwatch",
    price: 7.00,
    rating: 5,
    reviews: 99,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDQPzKv_oEqfR_FXYdgQBlChR3KnrBfofQTmdZ63pznKgXre8r4jUj1EzT6rMSXKt5NuRNdPwmU7v85Wigl4igKu2C0_n6zCLHVVVB_JMMXMOd_Hz4AtzDnwNAx23mpXV_N-oAZIcvt1VwHAMhsSK7D3MjNil7PabElSUGgp-G-w1Ztk2hMDJLkjfpfY4kijWcRhu8YTpawy31I5sKnKO3XPE-cmyb9RX8OpZJv0fO_6QaDjgMAWaHqvWiFFgYWAcbeVkzBve58yrs",
    badge: "BLACK FRIDAY",
    deliveryDate: "Wed, Nov 29",
    description: "Fitness tracker with voice functionality and health monitoring. Stay connected on the go."
  },
  {
    id: 11,
    title: "Sport Fitness Smart Watch",
    price: 24.00,
    rating: 4.5,
    reviews: 120,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKsGOZyMeKNj2CjCFWxUcfz6gTIVYtHBpNmrDZESpuDWb52BUuQpUPvOaGRqD5sjeaGKpyjSVkfJq3Vyhb_3H25E0Vf-1L4IZ58lCKUSd1zeVnWzCS7wtydpiBJWzV2MMi6fHrFlC0UDw1Jkp_8TJAlSwe-oc1zwrVmEvnt-YJXnEJsypUzQZi_TL7bi6e6iOGK8GKoY5WcdImsAGy1eHsTodYzr-c3ERAppW-ryZJ2uv992vk_5w_XhFje-qNTqnGrlrleRFbuOU",
    badge: "BLACK FRIDAY",
    deliveryDate: "Tues, Nov 28",
    description: "Rugged smart watch for outdoor sports and activity tracking. Waterproof and durable design."
  },
  {
    id: 12,
    title: "Galaxy S25 Ultra Phone",
    price: 385.00,
    rating: 5,
    reviews: 42,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC4l_c8uhpOGXY6w4nQZzX3WyjjvocML9Ftc0Z-6H5XkUSBnN-cCXyPni0QhKTAPQ7-Jhll0pcVAKBHSUecc4uvjxkH8AEppVu0MtH6HmKvnAFuvL1jLAnSEOFkfLRXVMk1RWWtUF2wpO1147VzM-vf3F39xnOHxEoFRoPyyjUVdiBzL2qXeiFney26sx3xrScQOsCmCOkOgkBdFdp2fS5B7i3V3QqUXV-AXb19g4faCNnb0RzNWK4zT7j9qIfEJHgPvujzgck_AYM",
    badge: "BLACK FRIDAY",
    deliveryDate: "Thurs, Nov 30",
    description: "Next-gen Galaxy phone with advanced camera zoom and S-Pen support. The ultimate productivity tool."
  },
];

export const PILL_FILTERS = [
  "Recommended",
  "Beauty & Health",
  "Women's Clothing",
  "Home & Kitchen",
  "Men's Clothing",
  "Sports & Outdoors",
  "Office & School",
  "Toys & Games",
];