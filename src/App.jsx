                    </div>
                    <button type="button" aria-label={`Remove ${item.name}`} onClick={() => removeFromCart(item.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t bg-slate-50 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>${cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax</span>
                  <span>${taxCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsCartOpen(false); setCheckoutStep('shipping'); }}
                  className="w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: siteSettings.primary_color }}
                >
                  Proceed to Order
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 🌟 社交媒体引流结账弹窗 */}
      {checkoutStep && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-slate-800">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <button onClick={() => setCheckoutStep(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>

            {checkoutStep === 'shipping' && (
              <form onSubmit={handleOrderSubmit} className="space-y-4">
                <h2 className="text-xl font-bold">订购与送货资料</h2>
                <p className="text-xs text-slate-500">填写您的送货资料后，系统将为您生成订单链接直接联系卖家确认。</p>
                <input required placeholder="您的姓名 (Full Name)" value={shippingInfo.fullName} onChange={e => setShippingInfo({...shippingInfo, fullName: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input required placeholder="电邮地址 (Email)" type="email" value={shippingInfo.email} onChange={e => setShippingInfo({...shippingInfo, email: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input required placeholder="收货地址 (Street Address)" value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="城市 (City)" value={shippingInfo.city} onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                  <input required placeholder="邮编 (Zip)" value={shippingInfo.zipCode} onChange={e => setShippingInfo({...shippingInfo, zipCode: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>

                <button type="submit" className="w-full text-white font-bold py-3.5 rounded-xl transition-all hover:opacity-90 shadow-md" style={{ backgroundColor: siteSettings.primary_color }}>
                  确认提交订单并联系卖家
                </button>
              </form>
            )}

            {checkoutStep === 'processing' && (
              <div className="text-center py-12 space-y-3">
                <RefreshCw className="w-10 h-10 animate-spin mx-auto" style={{ color: siteSettings.primary_color }} />
                <p className="font-bold">正在保存意向订单信息...</p>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="text-center py-6 space-y-5">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                
                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold text-slate-900">如需订购，请点击以下链接联系卖家 (WhatsApp / Instagram DM)</h2>
                  <p className="text-xs text-slate-500">
                    您的意向订单编号为 <span className="font-bold text-slate-800">#{lastPlacedOrderId}</span>，点击下方按钮将直接带您跳转至对应的聊天界面完成购买！
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
                  >
                    <MessageCircle className="w-5 h-5 fill-white" />
                    <span>通过 WhatsApp 直接发送订单</span>
                  </a>

                  <a
                    href={`https://instagram.com/${INSTAGRAM_USERNAME}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
                  >
                    <Instagram className="w-5 h-5" />
                    <span>通过 Instagram 私信 (DM) 联系</span>
                  </a>
                </div>

                <button 
                  onClick={() => setCheckoutStep(null)} 
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-xs transition-all mt-3"
                >
                  继续浏览网店
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}