import { useEffect } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import AppLogo from '../../assets/app-logo.svg?react'
import { getAppName } from '../../utils/env.utils'
import { useAppStore } from '../../store'
import { produceAppState } from '../../store'
import { loadLoginOidcProviders, setLoginMode, submitSignIn, submitSignUp, submitSignInWithSso } from '../../actions/login.actions'
import {
  Alert,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Divider,
  CircularProgress,
} from '@mui/material'

export default function LoginPage() {
  const intl = useIntl()
  const { name, email, password, confirmPassword, mode, status, errorMessage, oidcProviders } =
    useAppStore((state) => state.login)

  useEffect(() => {
    loadLoginOidcProviders()
  }, [])

  const isCreateAccount = mode === 'signUp'
  const isLoading = status === 'loading'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isCreateAccount) {
      submitSignUp()
    } else {
      submitSignIn()
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'level1',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, bgcolor: 'level0' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <AppLogo width={48} height={48} style={{ color: 'primary', marginBottom: 12 }} />
            <Typography variant="h5" fontWeight={600}>
              {getAppName()}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isCreateAccount ? <FormattedMessage defaultMessage="Create your account" /> : <FormattedMessage defaultMessage="Sign in to your account" />}
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {isCreateAccount && (
              <TextField
                label={intl.formatMessage({ defaultMessage: "Full Name" })}
                fullWidth
                size="small"
                value={name}
                disabled={isLoading}
                onChange={(e) =>
                  produceAppState((draft) => {
                    draft.login.name = e.target.value
                  })
                }
              />
            )}
            <TextField
              label={intl.formatMessage({ defaultMessage: "Email" })}
              type="email"
              fullWidth
              size="small"
              value={email}
              disabled={isLoading}
              onChange={(e) =>
                produceAppState((draft) => {
                  draft.login.email = e.target.value
                })
              }
            />
            <TextField
              label={intl.formatMessage({ defaultMessage: "Password" })}
              type="password"
              fullWidth
              size="small"
              value={password}
              disabled={isLoading}
              onChange={(e) =>
                produceAppState((draft) => {
                  draft.login.password = e.target.value
                })
              }
            />
            {isCreateAccount && (
              <TextField
                label={intl.formatMessage({ defaultMessage: "Confirm Password" })}
                type="password"
                fullWidth
                size="small"
                value={confirmPassword}
                disabled={isLoading}
                onChange={(e) =>
                  produceAppState((draft) => {
                    draft.login.confirmPassword = e.target.value
                  })
                }
              />
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              sx={{ mt: 1 }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : isCreateAccount ? (
                <FormattedMessage defaultMessage="Create Account" />
              ) : (
                <FormattedMessage defaultMessage="Sign In" />
              )}
            </Button>
          </Box>

          {oidcProviders.length > 0 && (
            <>
              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  <FormattedMessage defaultMessage="or" />
                </Typography>
              </Divider>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {oidcProviders.map((provider) => (
                  <Button
                    key={provider.id}
                    variant="outlined"
                    fullWidth
                    startIcon={<VpnKeyIcon />}
                    disabled={isLoading}
                    onClick={() => submitSignInWithSso(provider.id)}
                  >
                    {provider.name}
                  </Button>
                ))}
              </Box>
            </>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" textAlign="center">
            {isCreateAccount ? (
              <FormattedMessage
                defaultMessage="Already have an account? {link}"
                values={{
                  link: (
                    <Link
                      component="button"
                      variant="body2"
                      disabled={isLoading}
                      sx={{ verticalAlign: "baseline" }}
                      onClick={() => setLoginMode('signIn')}
                    >
                      <FormattedMessage defaultMessage="Sign in" />
                    </Link>
                  ),
                }}
              />
            ) : (
              <FormattedMessage
                defaultMessage="Don't have an account? {link}"
                values={{
                  link: (
                    <Link
                      component="button"
                      variant="body2"
                      disabled={isLoading}
                      sx={{ verticalAlign: "baseline" }}
                      onClick={() => setLoginMode('signUp')}
                    >
                      <FormattedMessage defaultMessage="Create one" />
                    </Link>
                  ),
                }}
              />
            )}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
