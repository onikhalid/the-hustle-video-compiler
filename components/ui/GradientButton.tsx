import React, { ButtonHTMLAttributes, ReactNode } from 'react';

// Button variant types
type ButtonVariant = 'default' | 'success' | 'danger' | 'warning' | 'custom' | 'orange-gold' | 'brown-gold';
type ButtonSize = 'xxs'| 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface CustomColors {
  gradientFrom?: string;
  gradientTo?: string;
  stroke?: string;
  text?: string;
  background?: string;
}

interface CustomBackground {
  type?: 'solid' | 'gradient' | 'image' | 'css';
  value?: string;
  gradientDirection?: string;
  gradientStops?: string[];
  imageUrl?: string;
  imageSize?: 'cover' | 'contain' | 'auto';
  imagePosition?: string;
  imageRepeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
}

interface CustomStyling {
  borderWidth?: number;
  borderRadius?: number;
  borderColor?: string;
  fontSize?: string;
  fontWeight?: string;
  padding?: string;
  height?: number;
  width?: number | string;
}

interface CustomSizeConfig {
  height?: number;
  width?: number | string;
  rx?: number;
  fontSize?: string;
  fontWeight?: string;
  iconSize?: number;
  padding?: string;
  textClass?: string;
  borderWidth?: number;
}


interface GradientButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  // Enhanced customization props
  colors?: CustomColors;
  styling?: CustomStyling;
  customBackground?: CustomBackground;
  customSizeConfig?: CustomSizeConfig;
  hoverScale?: number;
  activeScale?: number;
  disableGradient?: boolean;
  disableHoverEffects?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// Gradient definitions for different variants
const gradientVariants = {
  default: {
    fill: "url(#paint0_linear_default)",
    stroke: "#6AE385",
    text: "#FFFFFF",
    gradientStops: [
      { offset: "0%", color: "#15693C" },
      { offset: "100%", color: "#29CF76" }
    ]
  },
  success: {
    fill: "url(#paint0_linear_success)",
    stroke: "#4ADE80",
    text: "#FFFFFF",
    gradientStops: [
      { offset: "0%", color: "#166534" },
      { offset: "100%", color: "#22C55E" }
    ]
  },
  danger: {
    fill: "url(#paint0_linear_danger)",
    stroke: "#F87171",
    text: "#FFFFFF",
    gradientStops: [
      { offset: "0%", color: "#991B1B" },
      { offset: "100%", color: "#EF4444" }
    ]
  },
  warning: {
    fill: "url(#paint0_linear_warning)",
    stroke: "#FBBF24",
    text: "#000000",
    gradientStops: [
      { offset: "0%", color: "#92400E" },
      { offset: "100%", color: "#F59E0B" }
    ]
  },
  custom: {
    fill: "url(#paint0_linear_custom)",
    stroke: "#6366F1",
    text: "#FFFFFF",
    gradientStops: [
      { offset: "0%", color: "#4F46E5" },
      { offset: "100%", color: "#7C3AED" }
    ]
  },
  'orange-gold': {
    fill: "url(#paint0_linear_orange_gold)",
    stroke: "#FFC125",
    text: "#FFFFFF",
    gradientStops: [
      { offset: "0%", color: "#FFCC11" },
      { offset: "100%", color: "#C23A00" }
    ]
  },

  'brown-gold': {
    fill: "url(#paint0_linear_brown_gold)",
    stroke: "#C26600",
    text: "#FFFFFF",
    gradientStops: [
      { offset: "0%", color: "#C26600"},
      { offset: "100%", color: "#F1A325" }
    ]
  }
};

// Size configurations
const sizeConfig = {
  xxs: {
    height: 24,
    width: 150,
    rx: 12,
    textClass: "text-xs px-3",
    fontSize: "0.75rem",
    fontWeight: "font-medium",
    iconSize: 10,
    padding: "px-2"
  },
  xs: {
    height: 28,
    width: 200,
    rx: 14,
    textClass: "text-xs px-3",
    fontSize: "0.75rem",
    fontWeight: "font-medium",
    iconSize: 12,
    padding: "px-3"
  },
  sm: {
    height: 36,
    width: 240,
    rx: 18,
    textClass: "text-sm px-4",
    fontSize: "0.875rem",
    fontWeight: "font-semibold",
    iconSize: 16,
    padding: "px-4"
  },
  md: {
    height: 44,
    width: 312,
    rx: 22,
    textClass: "text-base px-6",
    fontSize: "1rem",
    fontWeight: "font-semibold",
    iconSize: 20,
    padding: "px-6"
  },
  lg: {
    height: 56,
    width: 384,
    rx: 28,
    textClass: "text-lg px-8",
    fontSize: "1.125rem",
    fontWeight: "font-bold",
    iconSize: 24,
    padding: "px-8"
  },
  xl: {
    height: 64,
    width: 448,
    rx: 32,
    textClass: "text-xl px-10",
    fontSize: "1.25rem",
    fontWeight: "font-bold",
    iconSize: 28,
    padding: "px-10"
  }
};

// Border radius configurations
const roundedConfig = {
  none: 0,
  xs:4,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999
};

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled = false,
  className = '',
  colors = {},
  styling = {},
  customBackground,
  customSizeConfig = {},
  hoverScale = 1.02,
  activeScale = 0.98,
  disableGradient = false,
  disableHoverEffects = false,
  rounded = 'md',
  ...props
}) => {
  // Merge custom size config with default size config
  const config = { ...sizeConfig[size], ...customSizeConfig };
  const gradientConfig = gradientVariants[variant];
  const gradientId = `paint0_linear_${variant}_${Math.random().toString(36).substr(2, 9)}`;

  // Merge custom styling with defaults
  const finalHeight = styling.height || config.height;
  const finalWidth = fullWidth ? '100%' : (styling.width || config.width);
  const finalBorderRadius = styling.borderRadius !== undefined ? styling.borderRadius : 
    (rounded !== 'md' ? roundedConfig[rounded] : config.rx);
  const finalBorderWidth = styling.borderWidth || 2;
  const finalFontSize = styling.fontSize || config.fontSize;
  const finalFontWeight = styling.fontWeight || config.fontWeight;
  const finalPadding = styling.padding || config.padding;

  // Color overrides
  // const finalTextColor = colors.text || gradientConfig.text;
  // const finalStroke = colors.stroke || gradientConfig.stroke;
  const finalBackground = colors.background;


  const finalTextColor = colors.text || gradientConfig.text;
// allow border color override directly from props.style or colors.stroke
const finalStroke = colors.stroke || styling.borderColor || gradientConfig.stroke;

  const isDisabled = disabled || loading;

  // Create gradient stops with custom colors if provided
//   const gradientStops = colors.gradientFrom && colors.gradientTo ? [
//     { offset: "0%", color: colors.gradientFrom },
//     { offset: "100%", color: colors.gradientTo }
//   ] : gradientConfig.gradientStops;

  // Generate custom background styles
  const getCustomBackgroundStyle = (): React.CSSProperties => {
    if (!customBackground) return {};

    switch (customBackground.type) {
      case 'solid':
        return {
          backgroundColor: customBackground.value,
        };
      
      case 'gradient':
        if (customBackground.gradientStops && customBackground.gradientStops.length > 0) {
          const direction = customBackground.gradientDirection || 'to right';
          const stops = customBackground.gradientStops.join(', ');
          return {
            background: `linear-gradient(${direction}, ${stops})`,
          };
        }
        return {
          background: customBackground.value,
        };
      
      case 'image':
        return {
          backgroundImage: `url(${customBackground.imageUrl || customBackground.value})`,
          backgroundSize: customBackground.imageSize || 'cover',
          backgroundPosition: customBackground.imagePosition || 'center',
          backgroundRepeat: customBackground.imageRepeat || 'no-repeat',
        };
      
      case 'css':
        return {
          background: customBackground.value,
        };
      
      default:
        return {
          background: customBackground.value,
        };
    }
  };

  const customBackgroundStyle = getCustomBackgroundStyle();

  // Create gradient stops with custom colors if provided
  const gradientStops = colors.gradientFrom && colors.gradientTo ? [
    { offset: "0%", color: colors.gradientFrom },
    { offset: "100%", color: colors.gradientTo }
  ] : gradientConfig.gradientStops;

  // Dynamic classes
  const hoverEffectClass = !disableHoverEffects && !isDisabled 
    ? `hover:scale-[${hoverScale}] active:scale-[${activeScale}]` 
    : '';
  
  const baseClasses = `relative cursor-pointer inline-flex items-center justify-center transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${finalFontWeight} ${finalPadding} ${hoverEffectClass} ${className}`;

  const buttonStyle = {
  width: finalWidth,
  height: finalHeight,
  fontSize: finalFontSize,
  color: finalTextColor,
  backgroundColor: finalBackground,
  borderRadius: disableGradient || customBackground ? `${finalBorderRadius}px` : undefined,
  border: disableGradient || customBackground ? `${finalBorderWidth}px solid ${finalStroke}` : undefined,
  ...customBackgroundStyle,
};

  // If gradient is disabled or custom background is used, render a simpler version
  if (disableGradient || customBackground) {
    return (
      <button
        className={baseClasses}
        disabled={isDisabled}
        style={buttonStyle}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2">
              <div 
                className="animate-spin rounded-full border-2 border-current/30 border-t-current"
                style={{ width: config.iconSize, height: config.iconSize }}
              />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              {leftIcon && (
                <span className="flex items-center" style={{ fontSize: config.iconSize }}>
                  {leftIcon}
                </span>
              )}
              <span>{children}</span>
              {rightIcon && (
                <span className="flex items-center" style={{ fontSize: config.iconSize }}>
                  {rightIcon}
                </span>
              )}
            </>
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      className={baseClasses}
      disabled={isDisabled}
      style={buttonStyle}
      {...props}
    >
      {/* SVG Background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 100 ${finalHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <rect
          x={finalBorderWidth / 2}
          y={finalBorderWidth / 2}
          width={100 - finalBorderWidth}
          height={finalHeight - finalBorderWidth}
          rx={finalBorderRadius - finalBorderWidth / 2}
          fill={`url(#${gradientId})`}
          stroke={finalStroke}
          strokeWidth={finalBorderWidth}
        />
        <defs>
          <linearGradient
            id={gradientId}
            x1="50%"
            y1="100%"
            x2="50%"
            y2="0%"
            gradientUnits="userSpaceOnUse"
          >
            {gradientStops.map((stop, index) => (
              <stop key={index} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
      </svg>

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <div className="flex items-center gap-2">
            <div 
              className="animate-spin rounded-full border-2 border-white/30 border-t-white"
              style={{ width: config.iconSize, height: config.iconSize }}
            />
            <span>Loading...</span>
          </div>
        ) : (
          <>
            {leftIcon && (
              <span className="flex items-center" style={{ fontSize: config.iconSize }}>
                {leftIcon}
              </span>
            )}
            <span>{children}</span>
            {rightIcon && (
              <span className="flex items-center" style={{ fontSize: config.iconSize }}>
                {rightIcon}
              </span>
            )}
          </>
        )}
      </span>
    </button>
  );
};

export default GradientButton;

/**
 * Usage Examples:
 * 
 * 1. Custom width with xs size styling:
 * <GradientButton
 *   size="xs"
 *   customSizeConfig={{ width: 300 }}
 * >
 *   Custom Width Button
 * </GradientButton>
 * 
 * 2. Custom width and height with md size other properties:
 * <GradientButton
 *   size="md"
 *   customSizeConfig={{
 *     width: 400,
 *     height: 50
 *   }}
 * >
 *   Custom Size Button
 * </GradientButton>
 * 
 * 3. Override specific size properties while keeping others:
 * <GradientButton
 *   size="xs"
 *   customSizeConfig={{
 *     width: 350,
 *     padding: "px-6",
 *     iconSize: 20
 *   }}
 * >
 *   Partially Custom Button
 * </GradientButton>
 * 
 * 4. Using styling prop for width (alternative method):
 * <GradientButton
 *   size="xs"
 *   styling={{ width: 280 }}
 * >
 *   Width via Styling
 * </GradientButton>
 */