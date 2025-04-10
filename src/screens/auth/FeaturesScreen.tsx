import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ViewStyle
} from 'react-native';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface FeatureCardProps {
  title: string;
  icon: string;
  backgroundColor: string;
  position: 'left' | 'right';
  size?: 'small' | 'medium' | 'large';
  onPress: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  title, 
  icon, 
  backgroundColor, 
  position,
  size = 'medium',
  onPress 
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseWidth = width * 0.4;
    let cardStyle: ViewStyle = {
      ...styles.featureCard,
      backgroundColor,
    };
    
    // Position specific styling
    if (position === 'left') {
      cardStyle = { ...cardStyle, alignSelf: 'flex-start', marginLeft: 16 };
    } else {
      cardStyle = { ...cardStyle, alignSelf: 'flex-end', marginRight: 16 };
    }
    
    // Size specific styling
    if (size === 'small') {
      cardStyle = { ...cardStyle, width: baseWidth * 0.8, paddingVertical: 8 };
    } else if (size === 'large') {
      cardStyle = { ...cardStyle, width: baseWidth * 1.2, paddingVertical: 12 };
    } else {
      cardStyle = { ...cardStyle, width: baseWidth, paddingVertical: 10 };
    }
    
    return cardStyle;
  };
  
  return (
    <TouchableOpacity 
      style={getCardStyle()} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{title}</Text>
    </TouchableOpacity>
  );
};

interface FeaturesScreenProps {
  navigation: any;
}

const FeaturesScreen: React.FC<FeaturesScreenProps> = ({ navigation }) => {
  const handleNavigateToSignIn = () => {
    navigation.navigate('SignIn');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Journal Card - Top Left */}
        <FeatureCard 
          title="Keep a journal" 
          icon="📓" 
          backgroundColor={COLORS.featureCardBg1}
          position="right"
          onPress={handleNavigateToSignIn}
        />
        
        {/* People images section */}
        <View style={styles.peopleImagesContainer}>
          {/* Person with laptop */}
          <View style={styles.leftPersonContainer}>
            <Image 
              source={require('../../../assets/person-laptop.png')}
              style={styles.personImage}
              resizeMode="cover"
            />
            <FeatureCard 
              title="Learn something new" 
              icon="💡" 
              backgroundColor={COLORS.featureCardBg3}
              position="left"
              size="large"
              onPress={handleNavigateToSignIn}
            />
          </View>
          
          {/* Person on train */}
          <View style={styles.rightPersonContainer}>
            <Image 
              source={require('../../../assets/person-train.png')}
              style={styles.personImage}
              resizeMode="cover"
            />
            <FeatureCard 
              title="Make a plan" 
              icon="📋" 
              backgroundColor={COLORS.featureCardBg2}
              position="right"
              onPress={handleNavigateToSignIn}
            />
          </View>
        </View>
        
        {/* Together, we can text */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Together,</Text>
          <Text style={styles.titleText}>we can</Text>
        </View>
        
        {/* Bottom cards section */}
        <View style={styles.bottomCardsContainer}>
          {/* Reading Story - Left */}
          <View style={styles.leftCardContainer}>
            <FeatureCard 
              title="Read a story" 
              icon="📚" 
              backgroundColor={COLORS.featureCardBg4}
              position="left"
              size="small"
              onPress={handleNavigateToSignIn}
            />
            <Image 
              source={require('../../../assets/person-reading.png')}
              style={styles.bottomImage}
              resizeMode="cover"
            />
          </View>
          
          {/* Just Vent - Right */}
          <View style={styles.rightCardContainer}>
            <FeatureCard 
              title="Just vent" 
              icon="💬" 
              backgroundColor={COLORS.featureCardBg5}
              position="right"
              size="small"
              onPress={handleNavigateToSignIn}
            />
            <Image 
              source={require('../../../assets/person-typing.png')}
              style={styles.bottomImage}
              resizeMode="cover"
            />
          </View>
        </View>
        
        {/* Add spacing at the bottom */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      {/* Pagination dots */}
      <View style={styles.pagination}>
        <View style={styles.paginationDot} />
        <View style={[styles.paginationDot, styles.activeDot]} />
        <View style={styles.paginationDot} />
      </View>
      
      {/* Home indicator */}
      <View style={styles.homeIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
  },
  peopleImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  leftPersonContainer: {
    width: '50%',
    alignItems: 'flex-start',
  },
  rightPersonContainer: {
    width: '50%',
    alignItems: 'flex-end',
  },
  personImage: {
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: 12,
    marginHorizontal: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  titleContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  titleText: {
    ...FONTS.italic,
    fontStyle: 'italic',
    color: COLORS.primary,
    fontSize: 32,
    lineHeight: 38,
  },
  bottomCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  leftCardContainer: {
    width: '50%',
    alignItems: 'flex-start',
  },
  rightCardContainer: {
    width: '50%',
    alignItems: 'flex-end',
  },
  bottomImage: {
    width: width * 0.42,
    height: width * 0.35,
    borderRadius: 12,
    marginHorizontal: 5,
    marginTop: 10,
    overflow: 'hidden',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
    ...SHADOWS.light,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  featureText: {
    ...FONTS.body4,
    color: COLORS.black,
    fontWeight: '500',
    fontSize: 14,
  },
  bottomSpacing: {
    height: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray,
    marginHorizontal: 5,
    opacity: 0.3,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    opacity: 1,
  },
  homeIndicator: {
    width: 135,
    height: 5,
    backgroundColor: '#000',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
    opacity: 0.2,
  },
});

export default FeaturesScreen; 