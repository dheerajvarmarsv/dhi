#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PythonBridge, NSObject)

RCT_EXTERN_METHOD(downloadModel:(NSString *)modelName
                  modelDir:(NSString *)modelDir
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(convertToFP16:(NSString *)modelName
                  modelDir:(NSString *)modelDir
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(quantizeModel:(NSString *)modelName
                  modelDir:(NSString *)modelDir
                  quantFormat:(NSString *)quantFormat
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end 